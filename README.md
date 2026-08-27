# Geofence Tracking API — Martı Case

*Son güncelleme: 28.08.2026*

Kullanıcılardan gelen konum bilgisini (enlem/boylam), önceden tanımlı coğrafi alanlarla (geofence) karşılaştırıp, bir alana **yeni** giriş olduğunda bunu veritabanına loglayan RESTful bir servis.

- Bir kullanıcı bir alana girdiğinde `user_id`, `area_id`, `entry_time` loglanır.
- Aynı alanda tekrar gelen ping'ler yeni giriş sayılmaz (debounce).
- Sistem yük altında performanslı çalışacak şekilde tasarlandı: PostGIS + GiST index ile hızlı coğrafi sorgu, Redis ile hem alan listesi cache'i hem kullanıcı debounce state'i.

> Bu dosyada çalıştırma notları var. Tasarım kararlarının gerekçeleri ayrı bir belgede: **[PROJE_SUNUM.md](PROJE_SUNUM.md)**

---

## Proje Yapısı

```
src/
├── main.ts                        # bootstrap: global pipe/filter/interceptor, Swagger
├── app.module.ts
├── config/                        # env validation, TypeORM/Redis bağlantı ayarları
├── database/
│   ├── data-source.ts             # migration CLI'ının kullandığı bağımsız DataSource
│   └── migrations/                # elle yazılan, gözden geçirilebilir SQL migration'lar
├── common/
│   ├── envelope/                  # { success, message, data, statusCode } zarfı
│   ├── exceptions/                # AppException hiyerarşisi + global exception filter
│   ├── dto/                       # PaginationQueryDto (tüm liste endpoint'leri paylaşır)
│   └── pagination/                # PaginationMeta hesaplama
├── cache/                         # Redis bağlantısı + alan listesi cache-aside
├── areas/                         # POST/GET /areas — entity, PostGIS repository, service, controller
├── locations/                     # POST /locations — containment strategy, debounce state, service, controller
│   ├── containment/                   # Strategy: GeofenceContainmentStrategy → PostgisContainmentStrategy
│   └── state/                         # UserAreaStateStore → RedisUserAreaStateStore (+ Postgres fallback)
└── logs/                          # GET /logs — entity, repository (filtre+sayfalama), service, controller
```

Katmanlı mimari: `controller → service → repository`, tek yönlü bağımlılık. `locations`, hem `areas`'ı (containment + alan adı) hem `logs`'u (loglama) service üzerinden kullanır; `areas` ve `logs` birbirinden habersizdir.

---

## Teknoloji

| Bileşen | Seçim | Gerekçe                                                                                                                                                       |
|---|---|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Framework | NestJS + TypeScript (strict) | Case'in şartı; DI, modül sistemi, decorator tabanlı validasyon                                                                                                |
| Veritabanı | PostgreSQL + **PostGIS** | Coğrafi sorgular (`ST_Contains`) için gerçek uzamsal index (GiST)                                                                                             |
| ORM | **TypeORM** (Prisma değil) | `geography`/`geometry` kolon tiplerini native destekliyordu bu yüzden bu şekilde tercih ettim; Prisma'da ancak raw query ile mümkündü o yüzden tercih etmedim |
| Cache | Redis (`ioredis`) | Alan listesi cache-aside + kullanıcı debounce state'i                                                                                                         |
| Validasyon | class-validator / class-transformer | DTO doğrulama, GeoJSON polygon için custom validator                                                                                                          |
| API docs | `@nestjs/swagger` | Otomatik Swagger UI + OpenAPI JSON                                                                                                                            |
| Test | Jest (unit) + gerçek Postgres'e karşı entegrasyon testleri | PostGIS'in geometrik doğruluğu mock'la kanıtlanamaz                                                                                                           |

---

## Hızlı Başlangıç

Gereksinim: Docker.

**Tek komutla (önerilen — Postgres, Redis ve uygulama, migration'lar dahil hepsi):**

```bash
cp .env.example .env
docker compose up --build
```

Uygulama container'ı ayağa kalkarken migration'ları kendisi çalıştırır (`docker-entrypoint.sh`), sonra API'yi başlatır.

**Lokal geliştirme (uygulamayı host'ta, watch modunda çalıştırmak için):**

Gereksinim: Node.js 20+ (proje Node 23 ile geliştirildi; `engines` uyarısı zararsız).

```bash
docker compose up -d postgres redis
npm install
cp .env.example .env
npm run migration:run
npm run start:dev
```

Uygulama `http://localhost:3000` adresinde çalışır:

- Swagger UI: http://localhost:3000/api-docs
- OpenAPI JSON: http://localhost:3000/api-docs-json

---

## Test

```bash
npm test                  # unit testler — hızlı, DB/Redis gerektirmez (mock'lu)
npm run test:integration  # PostGIS/Postgres'e karşı gerçek sorgu testleri — docker compose up gerekir
```

Entegrasyon testleri **seri** çalışır (`maxWorkers: 1`): iki ayrı entegrasyon test dosyası da aynı canlı veritabanına bağlanıyor ve `TRUNCATE ... CASCADE` ile kendi verisini temizliyor — paralel çalışsalar biri diğerinin verisini silebilir (gerçekten yaşandı, testler ara sıra rastgele başarısız oluyordu; sebebini bulup `maxWorkers: 1` ile kalıcı çözdüm). `npm test` (unit) bundan etkilenmez, her zaman paralel ve hızlı.

Uçtan uca, çalışan uygulamayla denemek için (uygulama ayaktayken **başka bir terminalde**):

```bash
./sample-requests.sh   # tek kullanıcı, temel akış + debounce
./demo-multi.sh        # çoklu kullanıcı/alan, filtreleme, sayfalama, Redis-restart senaryosu
```

---

## API

Tüm yanıtlar ortak bir envelope ile döner: `{ success, message, data, statusCode }`.

| Metot | Yol | Açıklama |
|---|---|---|
| `POST` | `/areas` | Yeni bir coğrafi alan (GeoJSON polygon) tanımlar |
| `GET` | `/areas` | Tanımlı alanları listeler (Redis cache-aside) |
| `POST` | `/locations` | Kullanıcı konumu bildirir; yeni alan girişi varsa loglar |
| `GET` | `/logs` | Loglanmış girişleri filtreleyip sayfalı listeler |

**Area oluşturmak için** (GeoJSON `Polygon`, koordinat sırası `[lng, lat]`)

```bash
curl -X POST http://localhost:3000/areas -H 'Content-Type: application/json' -d '{
  "name": "Kadikoy Merkez",
  "polygon": {
    "type": "Polygon",
    "coordinates": [[[28.9784,41.0082],[28.9884,41.0082],[28.9884,41.0182],[28.9784,41.0182],[28.9784,41.0082]]]
  }
}'
```

**Konum bildirmek için**

```bash
curl -X POST http://localhost:3000/locations -H 'Content-Type: application/json' \
  -d '{"userId":101,"latitude":41.01,"longitude":28.98}'
```

```json
{
  "success": true,
  "message": "OK",
  "data": { "entered": true, "area": { "id": "...", "name": "Kadikoy Merkez" } },
  "statusCode": 201
}
```

`entered: false` ya kullanıcı zaten o alandaysa (debounce) ya da hiçbir alanda değilse döner.

**Logları filtrelemek için**

```bash
curl "http://localhost:3000/logs?userId=101&page=1&limit=20"
```

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [{ "id": "...", "userId": 101, "areaId": "...", "areaName": "Kadikoy Merkez", "entryTime": "..." }],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  },
  "statusCode": 200
}
```

---

## Bilinen Sınırlar

- **Eşzamanlı istek yarışı:** Aynı kullanıcıdan gelen paralel `POST /locations` istekleri arasında `getCurrentArea` + `setCurrentArea` arasında küçük bir yarış penceresi var (Redis `WATCH`/Lua ile kilitlenmedi — bilinçli, case kapsamında over-engineering'den kaçınıldı).
- **Sınır noktası:** Bir nokta tam bir alanın sınırı üzerindeyse `ST_Contains` bunu "içeride değil" sayar (PostGIS'in strict-interior semantiği). Sınırı da içeri saymak isteniyorsa `ST_Covers`'a geçilebilir.
- **Çıkış loglanmıyor:** Case sadece girişi istediği için `location_logs`'ta çıkış kaydı yok. Bu yüzden Redis state'i Postgres'ten yeniden kurulurken ("Redis restart" senaryosu) elimizdeki tek bilgi "en son hangi alana girdi" — kullanıcı o alandan çıkıp uzun süre ping atmadıysa ve tam o sırada Redis flush olduysa, sistem onu hâlâ o alanda sanabilir. Nadir bir pencere, ama var.
- **Tie-break kuralı:** Bir nokta iç içe geçen iki alanın içindeyse en küçük alan (`ST_Area`) kazanır — bu bilinçli bir tasarım kararı, spec'te tanımlı değildi.
- **Node sürümü:** Geliştirme Node 23 ile yapıldı (paketlerin `engines` alanı 20/22/24 LTS bekliyor); işlevsel bir sorun çıkarmadı ama üretimde bir LTS sürüm tercih edilmeli.

---

## Nasıl Ölçeklenir

Case "yük altında performanslı çalışmalı" diyor; bunun için kurulan somut altyapı (GiST index, Redis cache) yeterli olsa da, çok daha yüksek trafik için düşünülen ama **bilerek kurulmayan** yol: bkz. [PROJE_SUNUM.md § Ölçeklenebilirlik](PROJE_SUNUM.md#ölçeklenebilirlik).
