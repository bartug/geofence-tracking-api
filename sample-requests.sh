#!/usr/bin/env bash
#
# Geofence Tracking API - calisan uygulamayi ornek isteklerle deneme scripti.
# Once "docker compose up -d" ve "npm run start:dev" ile uygulamayi baslatin,
# ardindan baska bir terminalde: ./sample-requests.sh
#
# Tarih: 26.08.2026
#
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"

pretty() { if command -v python3 >/dev/null 2>&1; then python3 -m json.tool; else cat; fi; }

echo "Uygulamanin hazir olmasi bekleniyor ($BASE) ..."
curl -s --retry 60 --retry-delay 1 --retry-connrefused -o /dev/null "$BASE/areas"
echo "Hazir."
echo

echo "== 1) Alan olustur (Kadikoy Merkez) =="
AREA_JSON=$(curl -s -X POST "$BASE/areas" -H 'Content-Type: application/json' -d '{
  "name": "Kadikoy Merkez",
  "polygon": {
    "type": "Polygon",
    "coordinates": [[[28.9784,41.0082],[28.9884,41.0082],[28.9884,41.0182],[28.9784,41.0182],[28.9784,41.0082]]]
  }
}')
echo "$AREA_JSON" | pretty
echo

echo "== 2) kullanici 101 alanin disinda bir konum bildiriyor (entered:false beklenir) =="
curl -s -X POST "$BASE/locations" -H 'Content-Type: application/json' \
  -d '{"userId":101,"latitude":40.0000000,"longitude":27.0000000}' | pretty
echo

echo "== 3) kullanici 101 alanin icine giriyor (entered:true beklenir, log yazilir) =="
curl -s -X POST "$BASE/locations" -H 'Content-Type: application/json' \
  -d '{"userId":101,"latitude":41.0100000,"longitude":28.9800000}' | pretty
echo

echo "== 4) kullanici 101 ayni alanda tekrar ping atiyor (debounce -> entered:false beklenir, YENI LOG YOK) =="
curl -s -X POST "$BASE/locations" -H 'Content-Type: application/json' \
  -d '{"userId":101,"latitude":41.0110000,"longitude":28.9810000}' | pretty
echo

echo "== 5) kullanici 101'in loglari (adim 3'ten TEK bir kayit beklenir, adim 4 tekrarlanmadi) =="
curl -s "$BASE/logs?userId=101" | pretty
echo

echo "== 6) Gecersiz istek -> 400 (userId eksik) =="
curl -s -X POST "$BASE/locations" -H 'Content-Type: application/json' \
  -d '{"latitude":41.01,"longitude":28.98}' | pretty
echo

echo "== 6b) Gecersiz istek -> 400 (userId sayi degil) =="
curl -s -X POST "$BASE/locations" -H 'Content-Type: application/json' \
  -d '{"userId":"ayse","latitude":41.01,"longitude":28.98}' | pretty
echo

echo "== 7) Gecersiz istek -> 400 (polygon kapali degil) =="
curl -s -X POST "$BASE/areas" -H 'Content-Type: application/json' -d '{
  "name": "Bozuk Alan",
  "polygon": {"type":"Polygon","coordinates":[[[28.97,41.00],[28.98,41.00],[28.98,41.01],[28.97,41.01]]]}
}' | pretty
