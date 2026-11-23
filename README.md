# Ambient Sleep (White Noise & Sleep Audio)

A clean, dark-mode ambient sound generator built to unbundle overpriced sleep apps ($60–$80/yr) like BetterSleep, Calm, and Headspace.

## 🌟 Key Features
- **Multi-Channel Audio Mixer**: Mix multiple ambient tracks simultaneously (Rain, Distant Thunder, Ocean Waves, Brown Noise, Box Fan, Campfire, Night Wind, Crickets).
- **Independent Volume Channels**: Dial in the exact levels for each sound.
- **Smart Sleep Timer**: Set countdowns (15m, 30m, 45m, 60m, 90m, 120m) with automatic smooth volume fade-out so users are never startled awake.
- **Android Background Audio**: Configured with `WAKE_LOCK` and foreground media playback to play continuously with the screen turned off.
- **Curated One-Tap Presets**: Instant mixes like "Rainy Night", "Deep Sleep", and "Cozy Cabin".
- **Zero Subscriptions & Zero Ads**: 100% private and offline-capable.

---

## 🚀 Running on Android

```powershell
cd C:\Users\jacob\Projects\ambient-sleep

# 1. Clean cache and install
npm install

# 2. Verify placeholder assets
node scripts/generate-assets.js

# 3. Prebuild Android native code
npx expo prebuild --platform android

# 4. Launch on Android
npm run android
```
