#!/bin/bash

echo "🚀 Mobil Uygulama Projesi Başlatılıyor..."

# Backend'i başlat
echo "📡 Backend başlatılıyor..."
cd backend/MobileApp.API
dotnet run &
BACKEND_PID=$!

# Biraz bekle
sleep 3

# Mobile uygulamayı başlat
echo "📱 Mobile uygulama başlatılıyor..."
cd ../../mobile/arayanibul
npm start &
MOBILE_PID=$!

echo "✅ Proje başlatıldı!"
echo "Backend: http://localhost:5000"
echo "Mobile: Expo development server açılacak"
echo ""
echo "Durdurmak için Ctrl+C tuşlayın"

# Ctrl+C ile her ikisini de durdur
trap "kill $BACKEND_PID $MOBILE_PID" EXIT

wait