/* app-shell.js — ใส่เฉพาะในแอป Android (Capacitor) ก่อนสคริปต์เกม · ไม่อยู่ในเว็บ */
(function () {
  window.MGB_APP = 'android';
  // แอปไม่ใช้ service worker (ไฟล์เกมฝังในแอปแล้ว · sw.js ไม่ได้คัดมา) → คืนการลงทะเบียนปลอมที่ไม่ทำอะไร ไม่ให้เกิด error
  try {
    if (navigator.serviceWorker) {
      var fake = { installing: null, waiting: null, active: null, scope: '/', update: function () { return Promise.resolve(); }, unregister: function () { return Promise.resolve(true); }, addEventListener: function () { } };
      navigator.serviceWorker.register = function () { return Promise.resolve(fake); };
    }
  } catch (e) { }
  function P() { return (window.Capacitor && window.Capacitor.Plugins) || {}; }
  // จอไม่ดับระหว่างเปิดแอป
  function awake() { try { var K = P().KeepAwake; if (K && K.keepAwake) K.keepAwake(); } catch (e) { } }
  awake();
  // สลับออกจากแอป → หยุดเสียง/วงรอบเกมตามปกติของเบราว์เซอร์ (visibilitychange) · กลับมา → ขอจอไม่ดับใหม่
  try { var A = P().App; if (A && A.addListener) A.addListener('appStateChange', function (s) { if (s && s.isActive) awake(); }); } catch (e) { }

  // ล็อกอิน Google ในแอป: Google บล็อกหน้าต่างล็อกอินใน WebView → ใช้หน้าเลือกบัญชีของ Android (native) แล้วส่ง idToken ให้ Firebase JS เดิม
  //  ห่อเฉพาะ provider google.com ของ linkWithPopup / signInWithPopup / reauthenticateWithPopup · อย่างอื่น (Facebook/รหัสผ่าน) ทำงานเหมือนเว็บ
  function nativeGoogleCred() {
    var F = P().FirebaseAuthentication;
    if (!F || !F.signInWithGoogle) return Promise.reject({ code: 'auth/operation-not-supported-in-this-environment', message: 'native google sign-in unavailable' });
    return F.signInWithGoogle({ skipNativeAuth: true }).then(function (r) {
      var t = r && r.credential && r.credential.idToken;
      if (!t) throw { code: 'auth/popup-closed-by-user', message: 'no idToken' };
      return firebase.auth.GoogleAuthProvider.credential(t);
    }, function (e) {
      var m = String((e && (e.message || e.code)) || e || '');
      throw { code: /cancel/i.test(m) ? 'auth/popup-closed-by-user' : 'auth/internal-error', message: m };
    });
  }
  function isGoogle(pv) { return pv && (pv.providerId === 'google.com'); }
  function withCred(e, cred) { if (e && !e.credential && /already-in-use/.test(e.code || '')) { try { e.credential = cred; } catch (x) { } } throw e; }
  function patchFirebase() {
    var fb = window.firebase; if (!fb || !fb.auth || !fb.User || fb.__mgbNative) return !!(fb && fb.__mgbNative);
    fb.__mgbNative = true;
    var U = fb.User.prototype, A = fb.auth.Auth && fb.auth.Auth.prototype;
    var lp = U.linkWithPopup, rp = U.reauthenticateWithPopup, sp = A && A.signInWithPopup;
    U.linkWithPopup = function (pv) { var u = this; if (!isGoogle(pv)) return lp.apply(u, arguments); return nativeGoogleCred().then(function (c) { return u.linkWithCredential(c).catch(function (e) { withCred(e, c); }); }); };
    if (rp) U.reauthenticateWithPopup = function (pv) { var u = this; if (!isGoogle(pv)) return rp.apply(u, arguments); return nativeGoogleCred().then(function (c) { return u.reauthenticateWithCredential(c); }); };
    if (sp) A.signInWithPopup = function (pv) { var a = this; if (!isGoogle(pv)) return sp.apply(a, arguments); return nativeGoogleCred().then(function (c) { return a.signInWithCredential(c); }); };
    return true;
  }
  (function wait(n) { if (patchFirebase() || n > 600) return; setTimeout(function () { wait(n + 1); }, 250); })(0);
})();
