# How Ardently — Publishing Guide
How to get the game working on Android and published as an app.

---

## STEP 1 — Test on Android RIGHT NOW (5 minutes)

**Use this method while developing — no setup needed:**

1. On your PC, open a terminal / command prompt in the game folder
2. Run this command:
   ```
   python -m http.server 8080
   ```
   (If that doesn't work, try: `python3 -m http.server 8080`)
3. Note your PC's local IP address (Settings → WiFi → your network → shows IP like `192.168.1.45`)
4. On your Android phone (connected to the same WiFi), open Chrome
5. Go to: `http://192.168.1.45:8080`
6. The game loads — saves work — Continue button works

**To stop the server:** press Ctrl+C in the terminal.

---

## STEP 2 — Publish on GitHub Pages (free hosting, ~15 minutes)

This gives the game a real URL that works on any device.

### 2a. Create a GitHub account
Go to https://github.com and sign up (free).

### 2b. Create a new repository
1. Click the **+** button → **New repository**
2. Name it `how-ardently` (or anything you like)
3. Set it to **Public**
4. Click **Create repository**

### 2c. Upload your game files
1. On your new repository page, click **uploading an existing file**
2. Drag ALL the game files into the upload area:
   - index.html, manifest.json, sw.js
   - All .js files (game.js, ui.js, events.js, etc.)
   - The `icons/` folder
3. Click **Commit changes**

### 2d. Enable GitHub Pages
1. Go to your repository **Settings** tab
2. Click **Pages** in the left sidebar
3. Under "Source", select **main** branch, **/ (root)** folder
4. Click **Save**
5. Wait 2-3 minutes, then your game is live at:
   `https://yourusername.github.io/how-ardently`

**Your game now:**
- Works on any browser, any device
- Saves persist properly
- Works offline after first visit (service worker caches everything)
- Has a proper URL you can share

---

## STEP 3 — Install as an app on Android (2 minutes)

Once it's on GitHub Pages:

1. Open Chrome on Android
2. Go to your GitHub Pages URL
3. Tap the **three dots menu** (⋮) in Chrome
4. Tap **"Add to Home Screen"** or **"Install app"**
5. Tap **Add**

The game now appears on your home screen as a proper app icon, opens fullscreen with no browser UI, and works offline.

---

## STEP 4 — Build a real Android APK (optional, ~1 hour)

This lets you install it as a proper `.apk` and eventually submit to the Play Store.

### What you need:
- Android Studio (free): https://developer.android.com/studio
- Java JDK 11+ (usually bundled with Android Studio)
- Your GitHub Pages URL from Step 2

### 4a. Install Android Studio
Download and install. Accept all defaults.

### 4b. Create the TWA project
1. In Android Studio, go to **File → New → New Project**
2. Select **"Basic Views Activity"** — actually, use the TWA template:
   - Install the **PWA Builder** plugin (File → Settings → Plugins → search PWA Builder)
   - OR use PWABuilder online at https://www.pwabuilder.com

### 4b (easier) — Use PWABuilder
1. Go to https://www.pwabuilder.com
2. Enter your GitHub Pages URL
3. Click **Package for stores**
4. Select **Android**
5. Download the generated APK
6. Transfer to your phone and install

**Play Store submission:** requires a Google Play developer account (£20 one-time) and following Google's review process.

---

## File structure to upload to GitHub

```
how-ardently/
├── index.html          ← main game file
├── manifest.json       ← PWA manifest (already created)
├── sw.js               ← service worker (already created)
├── game.js
├── events.js
├── actions.js
├── assets.js
├── titles.js
├── will.js
├── education.js
├── debut.js
├── lessons.js
├── schoolmates.js
├── schooling_ui.js
├── finance.js
├── pregnancy.js
├── wedding.js
├── people.js
├── ui.js
└── icons/
    ├── icon.svg
    ├── icon-192.png
    └── icon-512.png
```

---

## Troubleshooting

**"Site can't be reached" on local server:**
→ Make sure phone and PC are on the same WiFi network
→ Check your PC's firewall isn't blocking port 8080
→ Try port 3000 instead: `python -m http.server 3000`

**Game loads but save doesn't persist:**
→ Must be served over http:// or https://, not file://
→ Local server (Step 1) or GitHub Pages (Step 2) both fix this

**PWABuilder can't read my URL:**
→ Make sure GitHub Pages is enabled and the URL loads correctly first
→ The manifest.json must be present and valid

**APK installs but crashes:**
→ Usually a TWA configuration issue — the `assetlinks.json` file needs to match your signing key
→ For Play Store submission this matters; for personal use sideloading is fine
