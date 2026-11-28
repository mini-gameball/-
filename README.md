# แอป Android รุ่นทดสอบ (Capacitor) — เกมดีดลูกแก้ว

branch นี้แยกจากเว็บเกม (branch main) · ไม่มีซอร์สเกมแบบอ่านได้ — CI คัดไฟล์เกมที่ build แล้วจาก main มาใส่แอป

- push branch `android` → GitHub Actions build APK → หน้า Releases แท็ก `android-test` (ดาวน์โหลดบนมือถือ)
- ผล build ล่าสุด: branch `android-ci` (STATUS.txt + build-tail.log)
- `test-signing.keystore` = คีย์สำหรับรุ่นทดสอบเท่านั้น (ไม่ใช่คีย์ Play Store)
- appId `io.github.minigameball.marble` (เปลี่ยนได้ก่อนส่ง Play Store ครั้งแรกเท่านั้น)
