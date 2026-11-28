/* app-shell.js — ใส่เฉพาะในแอป Android (Capacitor) ก่อนสคริปต์เกม · ไม่อยู่ในเว็บ */
(function () {
  window.MGB_APP = 'android';
  // WebView ของ Android มี "; wv)" ใน userAgent → เกมเข้าใจว่าเปิดในแอป Facebook/LINE แล้วขึ้น "เปิดในเบราว์เซอร์ก่อนนะ"
  //  ในแอปเราล็อกอิน Google แบบ native ได้ → ตัด "; wv" ออกจากที่สคริปต์เห็น (ไม่กระทบเว็บ)
  try {
    var ua0 = navigator.userAgent || '';
    if (/; wv\)/.test(ua0)) Object.defineProperty(navigator, 'userAgent', { configurable: true, get: function () { return ua0.replace('; wv)', ')'); } });
  } catch (e) { }
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

  // เสียงพากย์: WebView ของ Android ไม่มีเสียงอ่าน (speechSynthesis ไม่ออกเสียง) → ทำ speechSynthesis ตัวแทน ส่งไปเสียงอ่านของมือถือ (Android TTS)
  //  ผ่าน @capacitor-community/text-to-speech · เกมเรียกใช้เหมือนบนเว็บทุกอย่าง (getVoices / speak / cancel / speaking)
  (function () {
    var T = P().TextToSpeech; if (!T || !T.speak) return;
    var voices = [], cur = 0, thai = null;
    function on(o) { return function (t, f) { (o._l[t] = o._l[t] || []).push(f); }; }
    function off(o) { return function (t, f) { var a = o._l[t]; if (a) { var i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } }; }
    function fire(o, t, ev) { try { if (typeof o['on' + t] === 'function') o['on' + t](ev); (o._l[t] || []).slice().forEach(function (f) { try { f(ev); } catch (e) { } }); } catch (e) { } }
    function U(text) { this.text = String(text == null ? '' : text); this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.onstart = this.onend = this.onerror = null; this._l = {}; this.addEventListener = on(this); this.removeEventListener = off(this); }
    function clamp(x, a, b, d) { x = +x; return isFinite(x) ? Math.max(a, Math.min(b, x)) : d; }
    var S = { speaking: false, pending: false, paused: false, onvoiceschanged: null, _l: {} };
    S.addEventListener = on(S); S.removeEventListener = off(S);
    S.getVoices = function () { return voices.slice(); };
    S.speak = function (u) {
      if (!u || !u.text) return;
      var id = ++cur; S.speaking = true;
      fire(u, 'start', { type: 'start', utterance: u });
      T.speak({ text: u.text, lang: (u.voice && u.voice.lang) || u.lang || 'th-TH', rate: clamp(u.rate, 0.1, 4, 1), pitch: clamp(u.pitch, 0.1, 2, 1), volume: clamp(u.volume, 0, 1, 1), queueStrategy: 0 })
        .then(function () { if (id === cur) S.speaking = false; fire(u, 'end', { type: 'end', utterance: u }); },
          function (e) { if (id === cur) S.speaking = false; fire(u, 'error', { type: 'error', error: String((e && e.message) || e), utterance: u }); });
    };
    S.cancel = function () { cur++; S.speaking = false; S.pending = false; try { T.stop().catch(function () { }); } catch (e) { } };
    S.pause = function () { }; S.resume = function () { };
    // เช็กว่ามือถือมีเสียงไทยไหม (รอเครื่องอ่านพร้อมก่อน: stop() ผ่าน = พร้อม) · มี → เสียงไทย 1 ตัว ให้มือถือเลือกเสียงตามที่ตั้งไว้ · ไม่มี → บอกเกมว่าไม่มีเสียงไทย (เกมเงียบเอง)
    function probe(n) {
      T.stop().then(function () { return T.isLanguageSupported({ lang: 'th-TH' }); }).then(function (r) {
        var ok = !!(r && r.supported); if (ok === thai) return; thai = ok;
        voices = [{ name: 'Android TTS', lang: ok ? 'th-TH' : 'en-US', localService: true, default: true, voiceURI: ok ? 'android-tts-th' : 'android-tts-en' }];
        fire(S, 'voiceschanged', { type: 'voiceschanged' });
      }, function () { if (n < 40) setTimeout(function () { probe(n + 1); }, 500); });
    }
    try {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: S });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: U });
      probe(0);
      // กลับเข้าแอป (เช่น เพิ่งไปโหลดเสียงไทยในตั้งค่ามือถือ) → เช็กใหม่
      var A2 = P().App; if (A2 && A2.addListener) A2.addListener('appStateChange', function (s) { if (s && s.isActive) probe(0); });
    } catch (e) { }
  })();

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
  function patchUser(u) {
    var U = u && Object.getPrototypeOf(u);
    if (!U || U.__mgbNative || typeof U.linkWithPopup !== 'function') return;
    U.__mgbNative = true;   // ผู้ใช้ทุกคนใช้ prototype เดียวกัน → ห่อครั้งเดียวพอ
    var lp = U.linkWithPopup, rp = U.reauthenticateWithPopup;
    U.linkWithPopup = function (pv) { var u = this; if (!isGoogle(pv)) return lp.apply(u, arguments); return nativeGoogleCred().then(function (c) { return u.linkWithCredential(c).catch(function (e) { withCred(e, c); }); }); };
    if (rp) U.reauthenticateWithPopup = function (pv) { var u = this; if (!isGoogle(pv)) return rp.apply(u, arguments); return nativeGoogleCred().then(function (c) { return u.reauthenticateWithCredential(c); }); };
  }
  // Firebase compat ไม่มี firebase.User ให้ห่อ → ห่อ Auth.prototype (มีทันทีที่ auth-compat โหลด) แล้วห่อผู้ใช้ตอนเกมอ่าน currentUser / ได้ user จาก onAuthStateChanged
  function patchAuth() {
    var fb = window.firebase, A = fb && fb.auth && fb.auth.Auth && fb.auth.Auth.prototype;
    if (!A) return false;
    if (A.__mgbNative) return true;
    A.__mgbNative = true;
    var sp = A.signInWithPopup;
    if (sp) A.signInWithPopup = function (pv) { var a = this; if (!isGoogle(pv)) return sp.apply(a, arguments); return nativeGoogleCred().then(function (c) { return a.signInWithCredential(c); }); };
    var d = Object.getOwnPropertyDescriptor(A, 'currentUser');
    if (d && d.get && d.configurable) Object.defineProperty(A, 'currentUser', { configurable: true, enumerable: d.enumerable, get: function () { var u = d.get.call(this); if (u) patchUser(u); return u; } });
    var oc = A.onAuthStateChanged;
    if (oc) A.onAuthStateChanged = function (next) {
      var a = arguments;
      if (typeof next === 'function') { a = Array.prototype.slice.call(arguments); a[0] = function (u) { if (u) patchUser(u); return next.apply(this, arguments); }; }
      return oc.apply(this, a);
    };
    return true;
  }
  // SDK โหลดตอนเข้าโหมดออนไลน์ครั้งแรก (อาจนานหลังเปิดแอป) → เช็กทุก 0.3 วิ จนห่อได้
  (function wait() { if (!patchAuth()) setTimeout(wait, 300); })();
})();
