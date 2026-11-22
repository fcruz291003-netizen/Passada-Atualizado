#!/usr/bin/env bash
# Gera o APK de teste (debug). Requer Node 20+, Java 21 e Android SDK (variável ANDROID_HOME).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d node_modules ] || npm install --legacy-peer-deps
[ -d android ] || npx cap add android
node scripts/patch-android.mjs
npx capacitor-assets generate --android --assetPath assets 2>/dev/null || echo "Aviso: ícones padrão mantidos."
npx cap sync android
( cd android && ./gradlew assembleDebug )
mkdir -p dist
cp android/app/build/outputs/apk/debug/app-debug.apk dist/passada-debug.apk
echo "Pronto: dist/passada-debug.apk"
