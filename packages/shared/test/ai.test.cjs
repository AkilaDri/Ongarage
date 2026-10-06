// The keyword rules provider behind getAi(): Sinhala, Singlish and English inputs taken
// from the apps' mock data. A Claude- or Laya-backed provider must pass the same tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const ai = load('ai/index').getAi();

test('classifyJob: service category from real descriptions', async () => {
  const cases = [
    ['එන්ජිමෙන් ගැටෙන ශබ්දයක් ඇසේ, විශේෂයෙන් ධාවනය කරන විට.', '1'],
    ['බ්‍රේක් තද කරන විට කෑගසන ශබ්දයක් ඇසේ.', '7'],
    ['ඩෑෂ්බෝඩ් ලයිට් නිවි නිවී දැල්වේ, ඇතැම් විට වාහනය පණගැන්වීම අපහසුයි.', '2'],
    ['Check engine ලයිට් දැල්වී ඇත. ස්කෑන් කර දෝෂය හඳුනා ගැනීමට අවශ්‍යයි.', '5'],
    ['වායු සමීකරණය (A/C) සීතල හුළඟ ලබා නොදේ.', '4'],
    ['brake eka thada karanakota sadde enawa, pads maru karanna ona', '7'],
    ['Front bumper has a dent after a small accident', '8'],
    ['Battery is dead, car not starting this morning, need it today', '11'],
  ];
  for (const [text, want] of cases) assert.equal((await ai.classifyJob(text)).value.categoryId, want, text);
});

test('classifyJob: urgency, parts mentioned, no guess on vague text', async () => {
  const urgent = await ai.classifyJob('Battery is dead, car not starting this morning, need it today');
  assert.equal(urgent.value.urgency, 'high');
  assert.ok(urgent.value.partsMentioned.includes('Battery 12V 45Ah'));
  assert.ok((await ai.classifyJob('brake eka thada karanakota sadde enawa, pads maru karanna ona')).value.partsMentioned.includes('Brake pads (front)'));
  const vague = await ai.classifyJob('මගේ වාහනයේ ප්‍රශ්නයක් තියෙනවා');
  assert.equal(vague.value.categoryId, null);
  assert.equal(vague.confidence, 0);
  // English words match whole words only: "dent" is found as a word, not inside "accident".
  assert.ok((await ai.classifyJob('Front bumper has a dent after a small accident')).evidence.includes('dent'));
});

test('classifySOS: breakdown type from the note', async () => {
  const cases = [
    ['පසු දකුණු ටයරය සම්පූර්ණයෙන්ම බැස්සා.', 'tire'],
    ['වාහනය පණගන්නේ නැහැ, ලයිට් අඳුරුයි.', 'battery'],
    ['ධාවනය කරමින් සිටියදී එන්ජිම නතර වුණා.', 'mechanical'],
    ['ටෙම්පරේචර් මීටරය රතු පැත්තට ගියා.', 'overheating'],
    ['petrol iwara una, para mada', 'fuel'],
    ['Car slid into a ditch, stuck in mud', 'winching'],
  ];
  for (const [text, want] of cases) assert.equal((await ai.classifySOS(text)).value.breakdownId, want, text);
  assert.notEqual((await ai.classifySOS('My white car is fine')).value.breakdownId, 'accident');
});

test('checkOffPlatform: payment and contact attempts, normal chat passes', async () => {
  const pay = await ai.checkOffPlatform('ඇප් එකෙන් නොවී කෙලින්ම ගෙවන්න, අඩුවට කරලා දෙන්නම්');
  assert.ok(pay.value.flagged && pay.value.signals.includes('payment'));
  const contact = await ai.checkOffPlatform('call me on 077 123 4567 or whatsapp');
  assert.ok(contact.value.signals.includes('phone') && contact.value.signals.includes('externalChat'));
  assert.equal((await ai.checkOffPlatform('ස්තූතියි, හෙට උදේ 9ට එන්නම්')).value.flagged, false);
});

test('triageComplaint: topic, refund, needs a person', async () => {
  const damage = await ai.triageComplaint('Car came back with a scratch on the door, I want my money back');
  assert.equal(damage.value.topic, 'damage');
  assert.ok(damage.value.refundAsked && damage.value.needsHuman);
  assert.equal((await ai.triageComplaint('ගාස්තුව වැඩියි, කිව්වට වඩා අමතර ගණනක් ගත්තා')).value.topic, 'price');
  assert.equal((await ai.triageComplaint('එම ප්‍රශ්නය ආයෙත් ආවා, හැදුවේ නැහැ')).value.topic, 'quality');
  assert.equal((await ai.triageComplaint('They put a recon part instead of genuine, not genuine at all')).value.topic, 'wrongPart');
});

test('suggestParts: lines from a diagnosis note', async () => {
  const a = (await ai.suggestParts('ඉදිරිපස බ්‍රේක් පෑඩ් ගෙවිලා, brake fluid ද මාරු කළ යුතුයි')).value.parts.map((p) => p.name);
  assert.ok(a.includes('Brake pads (front)') && a.includes('Brake fluid'));
  const b = (await ai.suggestParts('spark plugs worn, replace plugs x4, oil filter too')).value.parts;
  assert.equal(b.find((p) => p.name === 'Spark plugs (set)')?.qty, 4);
  assert.ok(b.some((p) => p.name === 'Oil filter'));
});

test('moderate: clean, contact details blocked, accusations go to a person', async () => {
  const clean = await ai.moderate('හොඳ සේවාවක්, ඉක්මනින් හැදුවා');
  assert.ok(clean.value.ok && clean.value.reasons.length === 0);
  const contact = await ai.moderate('Call 0771234567 for cheaper service');
  assert.ok(!contact.value.ok && contact.value.reasons.includes('contact'));
  const accusation = await ai.moderate('This garage is a scam, they cheat customers');
  assert.ok(accusation.value.ok && accusation.value.reasons.includes('accusation'));
});
