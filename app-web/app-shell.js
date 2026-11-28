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
})();
