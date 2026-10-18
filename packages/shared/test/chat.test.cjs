// The chat between a vehicle owner and a garage (marketplace/chat.ts): a message that moves the deal off the app is held
// back, and the simulated replies answer by keyword.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const chat = load('marketplace/chat');

test('ordinary messages go through; a phone number or paying elsewhere is held back', async () => {
  assert.equal(await chat.chatAllowed('කවදා වෙද්දී ඉවර වෙයිද?'), true);
  assert.equal(await chat.chatAllowed('මගේ නම්බර් එක 0771234567 අමතන්න'), false);
});

test('each side has ready-made replies', () => {
  assert.ok(chat.CHAT_QUICK.owner.length >= 3);
  assert.ok(chat.CHAT_QUICK.garage.length >= 3);
});

test('simulated replies follow the question and the side that answers', () => {
  assert.match(chat.simulatedChatReply('garage', 'කවදා වෙද්දී ඉවර වෙයිද?'), /සවස 5/);
  assert.match(chat.simulatedChatReply('garage', 'මිල ගැන විස්තරයක් දෙන්න'), /පරීක්ෂා වාර්තාව/);
  assert.match(chat.simulatedChatReply('owner', 'අමතර වැඩක් හමු වුණා, අනුමත කරන්න'), /අනුමත|කරගෙන/);
  assert.ok(chat.simulatedChatReply('garage', 'abc').length > 0);
  assert.ok(chat.simulatedChatReply('owner', 'abc').length > 0);
});
