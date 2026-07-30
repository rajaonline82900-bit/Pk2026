# M11 CLUBE — APK Update Guide (Hindi)

Ye 3 files aapke Android Studio project me replace karni hain, fir rebuild karna hai. Ek baar setup karo — future me website me kuch bhi change karo, APK me automatically dikhega (WebView har baar fresh load karega, cache disabled).

## 📁 Files (3):

1. **`MainActivity.kt`** — main Kotlin file (Activity class)
2. **`AndroidManifest.xml`** — permissions + activity declaration
3. **`activity_main.xml`** — WebView layout with progress bar

---

## 🚀 Steps (Android Studio):

### Step 1: Open aapka existing M11 project
- Android Studio me apna M11 CLUBE project khol
- Left side "Project" panel me `app/src/main` folder tak jao

### Step 2: `MainActivity.kt` replace karo
- Path: `app/src/main/java/com/m11/clube/MainActivity.kt`
- Purani file open karo, saara content select (Ctrl+A), delete
- Ye naya `MainActivity.kt` ka poora code paste karo

**⚠️ IMPORTANT:** Line 1 me `package com.m11.clube` — agar aapka package name alag hai (jaise `com.example.m11` ya `com.rajaonline.m11`), to line 1 me apne project ka correct package name daal do (`build.gradle` me `applicationId` me milega). AndroidManifest me bhi.

### Step 3: `AndroidManifest.xml` replace karo
- Path: `app/src/main/AndroidManifest.xml`
- Purana content delete karke naya paste
- **⚠️** Line 3 (`package="com.m11.clube"`) me apna project ka package name daalo agar different hai

### Step 4: `activity_main.xml` replace karo
- Path: `app/src/main/res/layout/activity_main.xml`
- Delete + paste

### Step 5: Build APK
- Menu: **Build → Clean Project**
- Fir: **Build → Rebuild Project**
- Fir: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- 1-2 minute me build ho jaayega
- Bottom right corner me "APK generated" popup aayega → **"locate"** click karke APK file lelo

### Step 6: Naye APK ko user tak pahunchao
- APK file ka naam usually `app-debug.apk` ya `app-release.apk` hoga
- Rename karke `m11.apk` kar do
- Upload karo: **VPS pe `/var/www/m11clube/frontend/public/m11.apk`** (purani wali overwrite karke)
- Ya website me jaha se download link hai wahi replace kar do

---

## ✅ Kya kaam karega ab:

- 🔄 **Auto-fresh** — jab bhi user app open karega, website ka LATEST version load hoga (no cache)
- 📤 **File upload** — deposit screenshot / KYC / QR wali functionality kaam karegi
- 📥 **Downloads** — koi bhi file download work karega (bill / invoice etc.)
- 💬 **WhatsApp / Telegram** — links pe click karne se seedha app khulega
- 💳 **UPI / Paytm** — payment intent app khol dega (`upi://`, `paytmmp://`)
- 🔙 **Back button** — WebView history handle karega (na ki turant app close)
- 📱 **Portrait lock** — sirf vertical mode me chalega (matka apps ke liye standard)

---

## 🐛 Common issues:

**"Cannot resolve symbol AppCompatActivity"** → `build.gradle (Module)` me add karo:
```gradle
implementation 'androidx.appcompat:appcompat:1.6.1'
implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
```

**"Package name mismatch"** → Line 1 of MainActivity.kt aur AndroidManifest.xml me exact same package name daalo (build.gradle me `applicationId` check karo)

**"Website nahi load ho rahi"** → `usesCleartextTraffic="true"` AndroidManifest me hai — HTTPS aur HTTP dono chalengi

**Icon / app name change karna** → `AndroidManifest.xml` line 15 me `android:label="M11 CLUBE"` change karo. Icon `app/src/main/res/mipmap-*` folders me hain (image files replace karo)

---

**Koi bhi issue aaye — screenshot bhejo, main turant solve karunga.**
