#!/bin/bash

echo "🚀 Arayanibul Projesi Başlatılıyor..."

# Backend'i başlat
echo "📡 Backend başlatılıyor..."
cd src/backend/API
dotnet run &
BACKEND_PID=$!

# Biraz bekle
sleep 3

# Mobile uygulamayı başlat
echo "📱 Mobile uygulama başlatılıyor..."
cd ../../../src/mobile
npx expo start &
MOBILE_PID=$!

echo "✅ Proje başlatıldı!"
echo "Backend: http://localhost:5000"
echo "Mobile: Expo development server açılacak"
echo ""
echo "Durdurmak için Ctrl+C tuşlayın"

# Ctrl+C ile her ikisini de durdur
trap "kill $BACKEND_PID $MOBILE_PID" EXIT

wait