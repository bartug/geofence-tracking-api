# Proje Sunum Notları — Geofence Tracking API

*28.08.2026*

> Bu belge, projeyi anlatırken kullanacağım nottur: **ne yaptım ve neden böyle yaptım.** Çalıştırma notları için [README.md](README.md)'ye bakılabilir.

---

## 1. Özetle ne istendi, ne yaptım

İstenen; belirli aralıklarla gelen kullanıcı konumlarını, önceden tanımlı coğrafi alanlarla (geofence) karşılaştırıp, bir alana giriş olduğunda bunu loglayan, yük altında performanslı çalışan bir NestJS/PostgreSQL servisiydi.

Ben de olayı şöyle kurguladım: her konum bildirimi önce PostGIS'e "bu nokta hangi alanın içinde?" diye soruyor (`ST_Contains`, GiST index'li). Sonuç, kullanıcının **önceki** durumuyla (Redis'te tutulan) karşılaştırılıyor; sadece **yeni** bir alana giriş varsa (aynı alanda tekrar değil) loglanıyor. Alan sorgulama tarafını bir **Strategy** arkasına aldım, PostGIS'e özel bilgi tek bir yerde kalsın diye. Alan listesi Redis'te cache-aside ile tutuluyor; `GET /logs` bile bu cache'i tekrar kullanıyor (join yerine).

---

## 2. Bir konum geldiğinde ne oluyor? (akış)

```
POST /locations
      │
      ▼
LocationsService.ingest()
      │
      ├─► GeofenceContainmentStrategy.findContainingArea(lat,lng)  ──► PostGIS ST_Contains (+ tie-break: en küçük alan)
      │
      ├─► UserAreaStateStore.getCurrentArea(userId)  ──► Redis (miss ise: Postgres'teki son log'dan yeniden kur)
      │
      └─► karar:
            aynı alan          → no-op
            yeni/farklı alan   → LogsService.logEntry() + state güncelle
            hiçbir alan değil  → state'i "dışarıda" olarak işaretle (loglanmaz)
```

Servis katmanı ince: containment ve state store'u birer soyutlama olarak kullanıyor, PostGIS'in veya Redis'in detaylarını bilmiyor.

---

## 3. Tasarım kararları (neden böyle?)

### 3.1 Neden TypeORM, neden Prisma değil?

Case TypeORM **veya** Prisma diyordu. TypeORM'ü seçtim çünkü `geography`/`geometry` kolon tiplerini native destekliyor (`@Column({ type: 'geography', spatialFeatureType: 'Polygon', srid: 4326 })`); Prisma'da PostGIS desteği raw query seviyesinde kalıyor. Buna rağmen `geography` kolonunun entity hydration'la düzgün GeoJSON'a dönmemesi gibi PostGIS'e özgü pürüzler yine de çıktı — bu yüzden okuma/yazmalar `ST_AsGeoJSON`/`ST_GeomFromGeoJSON` ile, query builder üzerinden parametreli olarak yapılıyor (entity, sadece tablo metadata'sı için var).

### 3.2 Tasarım Örüntüsü — Strategy (Containment)

`GeofenceContainmentStrategy` bir arayüz; tek gerçekleştirimi `PostgisContainmentStrategy`, `AreasService` üzerinden PostGIS'e gidiyor. Gerekçe: bugün alan sayısı küçükse yarın "alan sayısı sabit kaldığı sürece Redis'te cache'lenmiş GeoJSON üzerinde turf.js ile in-process point-in-polygon yapalım, DB round-trip'inden kurtulalım" denirse, `LocationsService`'e hiç dokunmadan yeni bir `TurfContainmentStrategy` eklenir. Tek implementasyonla bile bu ayrım, PostGIS'e özel tüm bilgiyi (`ST_Contains`, cast'ler, tie-break) `areas` modülünde tek bir yere hapsediyor — `locations` bunlardan habersiz.

### 3.3 Debounce — en kritik karar

İki alternatif vardı:

- **TTL'li bir cache** ("kullanıcı X dakikadır ping atmadıysa dışarıda say").
- **Açık state**: "kullanıcı en son hangi alandaydı", sadece farklı bir sonuç gelince değişir.

İkinciyi seçtim, çünkü TTL yanlış bir varsayım kurar: pings kesilmesi kullanıcının alandan çıktığı anlamına gelmez (telefon uykuya geçmiş, ağ kopmuş olabilir). Redis'te `user:{userId}:current_area` key'i TTL'siz tutuluyor; sadece açıkça farklı bir alana (veya hiçbir alana) girince değişiyor.

Bunun içinde ayrı bir incelik daha var: "dışarıda" durumunu `DEL` ile değil, boş string **sentinel**'i ile (`SET key ''`) işaretliyorum. `DEL` kullansaydım, "kullanıcı bilinçli dışarı çıktı" ile "Redis flush oldu, hiç bilgimiz yok" ayrımı kaybolurdu — ikisi de "key yok" görünür. Sentinel ile üçü de ayrı: gerçek alan id'si / boş string ("biliyoruz, dışarıda") / key hiç yok ("bilmiyoruz, Postgres'e sor").

### 3.4 Redis miss → Postgres fallback

Redis'te state kaybolduğunda (restart, flush), "hiç bilgimiz yok" varsayıp sıfırdan başlamak yerine, `location_logs`'taki **en son** kaydı (indexed sorgu, `(user_id, entry_time DESC)`) kaynak olarak kullanıyorum ve Redis'i onunla yeniden dolduruyorum. Bu, hız için doğruluktan ödün vermemenin somut hali: hızlı yol Redis, doğruluk kaynağı Postgres. Bilinen sınırı README'de var (bkz. "Bilinen Sınırlar").

### 3.5 `ST_Contains`, `ST_Within` değil, `ST_Intersects` değil

Bir alanın bir noktayı içerip içermediğini soruyorum — `ST_Contains(alan, nokta)` bunu doğrudan ve okunabilir şekilde ifade ediyor. `ST_Intersects` de kullanılabilirdi ama sınır üzerindeki temasları da "true" sayar; strict containment istediğim için uygun değildi. Sınırdaki nokta `ST_Contains` ile "içeride değil" sayılıyor — bilinçli bir tercih, README'de not düşüldü.

### 3.6 Neden `areaName`'i join ile değil, cache üzerinden çözüyorum

`GET /logs`, her satır için alan adını göstermesi gerekiyor. Bir SQL join yerine `LogsService`, `AreasService.findAll()`'u çağırıp bir `Map<id,name>` kuruyor — bu çağrı zaten Redis'te cache'li (Aşama 4'te kurulan cache-aside), yani ekstra bir DB sorgusu değil, var olan bir cache'in ikinci kullanıcısı. Ayrıca `logs` modülünü `areas` tablosundan tamamen habersiz tutuyor.

### 3.7 Migration'lar neden elle SQL

`geography(Polygon,4326)` kolon tipi ve GiST index'i TypeORM'un decorator tabanlı şema üretimine (`synchronize`/`migration:generate`) güvenilir şekilde bırakılamıyor. Bu yüzden ilk migration ham SQL — extension'lar, iki tablo, tüm index'ler tek seferde, elle yazıldı ve gözden geçirildi.

---

## 4. Eşzamanlılık

- **Alan sorgusu:** PostGIS'e her istek için gidiyor (cache'lenmiş geometri üzerinde hesap yapılmıyor) — GiST index sayesinde bu maliyetli değil, ve doğruluk garantisi cache tutarsızlığına kurban edilmiyor.
- **Debounce state:** `getCurrentArea` + `setCurrentArea` arasında atomik olmayan bir yarış penceresi var (aynı kullanıcıdan gerçekten eşzamanlı iki istek). Redis `WATCH`/Lua script ile kilitlenebilirdi; bilinçli olarak yapılmadı — bir case çalışmasında bu karmaşıklığı eklemek, gerçek kazanımdan daha çok "gösteriş için eklenmiş altyapı" izlenimi verirdi. README'de açıkça not edildi.
- **Cache invalidation:** `POST /areas` sonrası `areas:all` key'i silinir (cache-aside); iki eşzamanlı `POST /areas` arasında kısa bir pencerede biri diğerinin invalidation'ını "kaybedebilir" ama bir sonraki `GET /areas` her durumda DB'den taze veri çeker, kalıcı bir tutarsızlık oluşmaz.

---

## 5. Ölçeklenebilirlik

Case'in "yük altında performanslı çalışmalı" şartı için kurulan somut altyapı: PostGIS GiST index (coğrafi sorgu milisaniyeler içinde), Redis cache-aside (alan listesi için DB round-trip'i yok), ve state store için Redis'in tek-thread'li atomik `GET`/`SET` işlemleri.

Çok daha yüksek trafik için (ör. saniyede binlerce ping) düşünülen ama **bilerek kurulmayan** yol:

- **Mesaj kuyruğu (BullMQ/Redis tabanlı):** `POST /locations` isteği anında `202 Accepted` dönüp asıl işi (containment + log yazma) arka plan worker'ına bırakabilir. Kurulmadı çünkü bu ölçekte (case çalışması) ekstra hareketli parça (worker process, kuyruk izleme) demoyu ve testi karmaşıklaştırırdı — gerçek fayda, gerçek yük geldiğinde anlamlı.
- **Coğrafi indeksleme ölçeği:** Alan sayısı çok büyürse (ör. 100.000+ alan), GiST index yine çalışır ama alan listesi cache'i (`areas:all`, tek key'de tüm liste) o ölçekte anlamsızlaşır — bölgesel/geohash tabanlı parçalı cache'e geçilirdi.
- **Okuma ölçeklendirmesi:** `GET /logs` büyük veri setlerinde read-replica'ya yönlendirilebilir; şu an tek bağlantı havuzu yeterli.

Containment'ı `Strategy` arkasına aldığım için, böyle bir geçişte `LocationsService`'in geri kalanı değişmeden kalır.

---

## 6. Benzer çalışmalar

Bu projeyle örtüşen, backoffice-api'de daha önce yazdığım gerçek bir özellik var: sürücülerin GPS konumuna göre yakındaki taksi duraklarını bulan bir Redis GEO servisi (`StationLocationRedisServiceImpl`), yarıçap eşiği config'ten okunuyordu. Oradaki "yakınlık sorgusu" deseni bu projedeki "içinde mi" sorgusuyla akraba, ama farklı bir problem: burada sabit yarıçap değil, keyfi şekilli poligonlar var — bu yüzden Redis GEO yerine PostGIS'e (gerçek polygon geometrisi tutabilen) geçtim.

Bundan ayrı, sahada test ettiğimiz bir POS cihazından alınan konumu bir alana girince taksiyi sıraya sokan bir uygulama da geliştirmiştim — kurulumunu sahada bizzat yapıp sundum. Bu projedeki "konum + alana girince aksiyon üret" deseni, o çalışmayla neredeyse birebir örtüşüyor.

---

## 7. Varsayımlar

- `latitude`/`longitude` WGS84 (SRID 4326) — standart GPS koordinat sistemi; konumun çalışır bir cihazdan geldiği varsayıldı.
- Bir kullanıcıya ait ardışık konum bildirimleri **sıralı** işlenir (aynı istemciden akış); sıra garanti edilmeseydi debounce mantığı sunucu saatine değil, istemcinin gönderdiği bir zaman damgasına göre karar vermeliydi (bu case'de konum bildirimi zaman damgası taşımıyor, sunucu `now()` kullanıyor).
- "Giriş" sadece pozitif olay olarak modellendi; "çıkış" spec'te istenmediği için ayrı bir kayıt/endpoint yok.
- Alan poligonları basit (self-intersecting olmayan, tek dış halka + opsiyonel iç halkalar) GeoJSON `Polygon`'lardır; `MultiPolygon` desteklenmiyor.
