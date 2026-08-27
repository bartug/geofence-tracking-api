#!/usr/bin/env bash
#
# Geofence Tracking API - DEMO: Cok kullanici/alan, filtreleme, sayfalama,
# ve Redis restart (Postgres fallback) senaryosu.
# Once "docker compose up -d" ve "npm run start:dev" ile uygulamayi baslatin,
# ardindan baska bir terminalde: ./demo-multi.sh
#
# Tarih: 26.08.2026
#
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
REDIS_CONTAINER="${REDIS_CONTAINER:-geofence-redis}"

pretty() { if command -v python3 >/dev/null 2>&1; then python3 -m json.tool; else cat; fi; }
extract_id() { python3 -c "import json,sys; print(json.load(sys.stdin)['data']['id'])"; }
item_count() { python3 -c "import json,sys; print(len(json.load(sys.stdin)['data']['items']))"; }

echo "Uygulamanin hazir olmasi bekleniyor ($BASE) ..."
curl -s --retry 60 --retry-delay 1 --retry-connrefused -o /dev/null "$BASE/areas"
echo "Hazir."
echo

echo "== Iki alan olustur (birbirinden uzak) =="
AREA_A=$(curl -s -X POST "$BASE/areas" -H 'Content-Type: application/json' -d '{
  "name": "Alan A",
  "polygon": {"type":"Polygon","coordinates":[[[28.90,41.00],[28.95,41.00],[28.95,41.05],[28.90,41.05],[28.90,41.00]]]}
}' | extract_id)
AREA_B=$(curl -s -X POST "$BASE/areas" -H 'Content-Type: application/json' -d '{
  "name": "Alan B",
  "polygon": {"type":"Polygon","coordinates":[[[29.10,41.00],[29.15,41.00],[29.15,41.05],[29.10,41.05],[29.10,41.00]]]}
}' | extract_id)
echo "Alan A: $AREA_A"
echo "Alan B: $AREA_B"
echo

# Kullanicilar sayisal ID'dir (bkz. IngestLocationRequestDto.userId): 201, 202, 203.
post() {
  curl -s -X POST "$BASE/locations" -H 'Content-Type: application/json' \
    -d "{\"userId\":$1,\"latitude\":$2,\"longitude\":$3}" \
    -w "\n  [kullanici $1] HTTP %{http_code}\n"
}

echo "== kullanici 201 : Alan A'da kaliyor (3 ping, TEK giris beklenir - debounce) =="
post 201 41.020 28.920
post 201 41.021 28.921
post 201 41.019 28.919
echo

echo "== kullanici 202 : Alan A'dan Alan B'ye geciyor (IKI giris beklenir) =="
post 202 41.020 28.920
post 202 41.020 29.120
echo

echo "== kullanici 203 : hep alanlarin disinda (hic giris beklenmiyor) =="
post 203 10.0 10.0
post 203 11.0 11.0
echo

echo "== Kullaniciya gore loglar =="
for u in 201 202 203; do
  echo "  --- kullanici $u ---"
  curl -s "$BASE/logs?userId=$u" | pretty
done
echo

echo "== Alan A'ya gore loglar (201 + 202'nin ilk girisi beklenir) =="
curl -s "$BASE/logs?areaId=$AREA_A" | pretty
echo

echo "== Sayfalama (page=1&limit=1) =="
curl -s "$BASE/logs?page=1&limit=1" | pretty
echo

echo "== Redis restart senaryosu: kullanici 202'nin debounce state'i elle silinir =="
if docker exec "$REDIS_CONTAINER" redis-cli DEL "user:202:current_area" > /dev/null 2>&1; then
  echo "Redis key silindi (restart/flush simulasyonu)."
  echo "kullanici 202 Alan B'de tekrar ping atiyor (Postgres fallback devreye girmeli, entered:false, YENI LOG YOK):"
  post 202 41.021 29.121
  echo "Alan B'deki kullanici 202 log sayisi (hala 1 olmali, duplicate yok):"
  curl -s "$BASE/logs?userId=202&areaId=$AREA_B" | item_count
else
  echo "UYARI: '$REDIS_CONTAINER' container'ina erisilemedi, bu adim atlandi (docker compose up -d calisiyor mu?)"
fi
