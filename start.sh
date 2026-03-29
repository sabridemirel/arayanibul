#!/bin/bash

echo "Arayanibul Projesi Baslatiliyor..."

# Docker: Backend + Web + PostgreSQL
echo ""
echo "[1/2] Docker servisler baslatiliyor (postgres + api + web)..."
docker compose up -d --build

echo ""
echo "Servisler hazir olana kadar bekleniyor..."
echo "  - API: http://localhost:5001/api"
echo "  - Web: http://localhost:3000"
echo "  - Swagger: http://localhost:5001/swagger"
echo ""

# API hazir olana kadar bekle
echo "API hazir olmasi bekleniyor..."
until curl -s http://localhost:5001/health > /dev/null 2>&1; do
  printf "."
  sleep 2
done
echo " Hazir!"

# Mobile simulatorler
echo ""
echo "[2/2] Mobile simulatorler baslatiliyor..."
cd src/mobile

# iOS Simulator
echo "iOS Simulator baslatiliyor..."
npx expo run:ios --no-bundler &
IOS_PID=$!

# Android Emulator
echo "Android Emulator baslatiliyor..."
npx expo run:android --no-bundler &
ANDROID_PID=$!

# Expo bundler'i baslat
echo "Expo bundler baslatiliyor..."
npx expo start &
EXPO_PID=$!

echo ""
echo "Tum servisler calisiyor:"
echo "  Docker -> postgres, api, web"
echo "  iOS Simulator, Android Emulator, Expo bundler"
echo ""
echo "Durdurmak icin Ctrl+C"

trap "kill $IOS_PID $ANDROID_PID $EXPO_PID 2>/dev/null; docker compose stop" EXIT

wait $EXPO_PID
