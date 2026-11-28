# คัดไฟล์เว็บเกม (จาก branch main ที่ checkout ไว้ใน site/) → www/ แล้วใส่ app-shell.js ไว้ต้น <head>
import io, os, shutil, sys
site, www = sys.argv[1], sys.argv[2]
page = sys.argv[3] if len(sys.argv) > 3 else 'index.html'   # 'test/index.html' = ใช้เว็บหน้าทดสอบ (/-/test/) สร้าง APK ทดสอบก่อนขึ้นเว็บจริง
shutil.rmtree(www, ignore_errors=True); os.makedirs(www)
shutil.copy(os.path.join(site, page), os.path.join(www, 'index.html'))
for f in ['favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'LICENSE', 'LICENSE-hand-model.txt']:
    if os.path.exists(os.path.join(site, f)): shutil.copy(os.path.join(site, f), www)
shutil.copytree(os.path.join(site, 'flags'), os.path.join(www, 'flags'))
shutil.copy('app-web/app-shell.js', www)
p = os.path.join(www, 'index.html'); s = io.open(p, encoding='utf-8').read()
i = s.find('<head>'); assert i >= 0, 'no <head>'
s = s[:i + 6] + '\n<script src="app-shell.js"></script>' + s[i + 6:]
io.open(p, 'w', encoding='utf-8').write(s)
import re
sw = io.open(os.path.join(site, 'sw.js'), encoding='utf-8').read()
m = re.search(r"VERSION\s*=\s*'([0-9.]+)'", sw)
print((m.group(1) if m else 'unknown') + ('-webtest' if page != 'index.html' else ''))
