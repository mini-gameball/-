// ทดสอบตัวแทน speechSynthesis → Android TTS (จำลองปลั๊กอิน): node tests/app-shell-tts.test.js
const fs = require('fs');
let ready = false, thaiOK = true, spoken = [], stops = 0, pendingResolve = null;
setTimeout(() => ready = true, 700);   // เครื่องอ่านพร้อมหลัง 0.7 วิ
const T = {
  speak: (o) => new Promise((res, rej) => { if (!ready) return rej(new Error('unavailable')); spoken.push(o); pendingResolve = res; setTimeout(() => { if (pendingResolve === res) { pendingResolve = null; res(); } }, 300); }),
  stop: () => ready ? (stops++, pendingResolve = null, Promise.resolve()) : Promise.reject(new Error('Not yet initialized')),
  isLanguageSupported: ({ lang }) => Promise.resolve({ supported: lang === 'th-TH' && thaiOK }),
};
let appCb = null;
const win = { Capacitor: { Plugins: { TextToSpeech: T, App: { addListener: (n, f) => { if (n === 'appStateChange') appCb = f; } }, KeepAwake: { keepAwake() { } } } } };
new Function('window', fs.readFileSync('/home/claude/android-app/app-web/app-shell.js', 'utf8'))(win);
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const S = win.speechSynthesis, U = win.SpeechSynthesisUtterance;
ok('speechSynthesis' in win && 'SpeechSynthesisUtterance' in win, 'มี speechSynthesis + SpeechSynthesisUtterance (เงื่อนไข this.tts ของเกม)');
ok(S.getVoices().length === 0, 'ตอนเปิดแอป ยังไม่มีเสียง (เกมรอ voiceschanged)');
// จำลอง Voice ของเกม
const game = { voice: null, noThai: false };
const score = v => (/natural|neural|online|premium|enhanced|wavenet/i.test(v.name) ? 8 : 0) + (v.localService === false ? 2 : 0) + (/google/i.test(v.name) ? 1 : 0) + (/^th[-_]TH$/i.test(v.lang) ? 1 : 0) - (/compact|espeak|eloquence/i.test(v.name) ? 6 : 0);
const pick = () => { const vs = (S.getVoices() || []).filter(v => /^th([-_]|$)/i.test(v.lang)); if (!(S.getVoices() || []).length) return; game.voice = vs.sort((a, b) => score(b) - score(a))[0] || null; game.noThai = !game.voice; };
pick(); S.addEventListener('voiceschanged', pick);
setTimeout(async () => {
  ok(game.voice && game.voice.lang === 'th-TH' && !game.noThai, 'หลังเครื่องอ่านพร้อม เกมได้เสียงไทย');
  // speak แบบเกม
  S.cancel(); const u = new U('ลงหลุมแล้ว สุดยอด'); u.lang = 'th-TH'; u.voice = game.voice; u.rate = 1.1; u.pitch = 1.25; u.volume = 1;
  let ended = false; u.onend = () => ended = true;
  S.speak(u);
  ok(S.speaking === true, 'speaking = true ระหว่างพูด (score_fx รอคิว)');
  const o = spoken[spoken.length - 1];
  ok(o && o.text === 'ลงหลุมแล้ว สุดยอด' && o.lang === 'th-TH' && o.rate === 1.1 && o.pitch === 1.25 && o.queueStrategy === 0, 'ส่งข้อความ/ภาษา/จังหวะ/ระดับเสียงไปเครื่องอ่านครบ');
  await new Promise(r => setTimeout(r, 400));
  ok(S.speaking === false && ended, 'พูดจบ → speaking = false + onend');
  // cancel กลางคัน
  S.speak(new U('ประโยคยาว')); S.cancel();
  ok(S.speaking === false && stops > 0, 'cancel → หยุดทันที');
  // ไม่มีเสียงไทย
  thaiOK = false; appCb({ isActive: true }); await new Promise(r => setTimeout(r, 100));
  ok(game.noThai === true, 'มือถือไม่มีเสียงไทย → เกมรู้ (noThai) แล้วเงียบเอง');
  thaiOK = true; appCb({ isActive: true }); await new Promise(r => setTimeout(r, 100));
  ok(game.noThai === false && game.voice, 'โหลดเสียงไทยแล้วกลับเข้าแอป → ใช้ได้ทันที');
  console.log(`\n${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
}, 1500);
