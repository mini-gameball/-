// ทดสอบ app-shell.js กับ Firebase Auth emulator: firebase emulators:start --only auth --project demo-mgb แล้ว node tests/app-shell-auth.test.js (ต้องมี firebase@10.12.5 compat)
const fs = require('fs');
const win = {};
let mode = 'ok', calls = 0, tok = { sub: 'g-1', email: 'p@x.com', email_verified: true };
win.Capacitor = { Plugins: { FirebaseAuthentication: { signInWithGoogle: async (o) => { calls++; if (!o || o.skipNativeAuth !== true) throw new Error('skipNativeAuth missing'); if (mode === 'cancel') throw { message: 'User cancelled the selector' }; return { credential: { idToken: JSON.stringify(tok) } }; } } } };
// UA ของ WebView จริง
Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36' });
new Function('window', 'firebase_unused', fs.readFileSync('/home/claude/android-app/app-web/app-shell.js', 'utf8'))(win);
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
ok(!/; wv\)/.test(navigator.userAgent) && /Android 14/.test(navigator.userAgent), 'UA ไม่มี "; wv)" แต่ยังเป็น Android: ' + navigator.userAgent.slice(0, 60));
const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|\bLine\/|TikTok|musical_ly|BytedanceWebview|Bytedance|Twitter|MicroMessenger/i.test(navigator.userAgent) || (/Android/i.test(navigator.userAgent) && /; wv\)/.test(navigator.userAgent));
ok(IN_APP === false, 'เงื่อนไข IN_APP ของ cloud.html = false');
setTimeout(async () => {   // จำลอง: SDK โหลดทีหลัง (เหมือน _loadSDK)
  const firebase = require('/tmp/fbchk/node_modules/firebase/compat/app').default;
  require('/tmp/fbchk/node_modules/firebase/compat/auth');
  global.firebase = firebase; win.firebase = firebase;
  await new Promise(r => setTimeout(r, 700));
  ok(firebase.auth.Auth.prototype.__mgbNative === true, 'ห่อ Auth.prototype หลัง SDK โหลดช้า');
  firebase.initializeApp({ apiKey: 'fake-key', projectId: 'demo-mgb', authDomain: 'demo-mgb.firebaseapp.com' });
  const auth = firebase.auth(); auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
  try {
    await auth.signInAnonymously(); const u1 = auth.currentUser, uid1 = u1.uid;
    ok(u1.isAnonymous, 'เริ่มเป็นบัญชีนิรนาม');
    // เส้นทางเดียวกับ online.js linkProvider: u.linkWithPopup(new GoogleAuthProvider())
    const pv = new firebase.auth.GoogleAuthProvider(); pv.setCustomParameters({ prompt: 'select_account' });
    await auth.currentUser.linkWithPopup(pv);
    const u = auth.currentUser;
    ok(calls === 1, 'เรียก native signInWithGoogle 1 ครั้ง');
    ok(u.uid === uid1 && u.isAnonymous === false, 'ผูกแล้ว uid เดิม (ข้อมูลเดิมอยู่ครบ)');
    ok((u.providerData || []).some(p => p.providerId === 'google.com' && p.email === 'p@x.com'), 'providerData มี google.com + อีเมล');
    // เครื่องใหม่: นิรนามอีกคน ผูก Google เดิม → credential-already-in-use + e.credential → เกมถามแล้ว signInWithCredential
    await auth.signOut(); await auth.signInAnonymously(); const uid2 = auth.currentUser.uid;
    let err = null; try { await auth.currentUser.linkWithPopup(new firebase.auth.GoogleAuthProvider()); } catch (e) { err = e; }
    ok(err && err.code === 'auth/credential-already-in-use' && !!err.credential, 'บัญชี Google เคยใช้แล้ว → code ' + (err && err.code) + ' + มี e.credential');
    ok(auth.currentUser.uid === uid2 && auth.currentUser.isAnonymous, 'ยังไม่สลับเอง (รอถามผู้เล่น)');
    await auth.signInWithCredential(err.credential);
    ok(auth.currentUser.uid === uid1, 'สลับไปบัญชีเดิมด้วย e.credential ได้');
    // signInWithPopup (google) → native
    await auth.signOut(); const c0 = calls; await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    ok(calls === c0 + 1 && auth.currentUser.uid === uid1, 'signInWithPopup(Google) ใช้ native ได้ uid เดิม');
    // reauthenticate
    await auth.currentUser.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
    ok(calls === c0 + 2, 'reauthenticateWithPopup ใช้ native');
    // ยกเลิกหน้าเลือกบัญชี
    await auth.signOut(); await auth.signInAnonymously(); mode = 'cancel';
    let e2 = null; try { await auth.currentUser.linkWithPopup(new firebase.auth.GoogleAuthProvider()); } catch (e) { e2 = e; }
    ok(e2 && e2.code === 'auth/popup-closed-by-user', 'กดยกเลิก → auth/popup-closed-by-user');
    ok(auth.currentUser.isAnonymous, 'ยกเลิกแล้วยังเป็นนิรนามเหมือนเดิม');
    // provider อื่นไม่ผ่าน native
    mode = 'ok'; const c1 = calls; let e3 = null;
    try { await auth.currentUser.linkWithPopup(new firebase.auth.FacebookAuthProvider()); } catch (e) { e3 = e; }
    ok(calls === c1, 'Facebook ไม่เรียก native (ใช้ของเดิม)');
    // รหัสผ่าน (linkWithCredential) ไม่กระทบ
    await auth.currentUser.linkWithCredential(firebase.auth.EmailAuthProvider.credential('u1@marble-gameball.firebaseapp.com', 'pw123456'));
    ok(auth.currentUser.providerData.some(p => p.providerId === 'password'), 'ตั้งชื่อผู้ใช้+รหัสผ่านยังใช้ได้');
  } catch (e) { fail++; console.log('FAIL exception', e && (e.code || e.message || e)); }
  console.log(`\n${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
}, 1000);
