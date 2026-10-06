const MONTHS = ['ජන.', 'පෙබ.', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ.', 'සැප්.', 'ඔක්.', 'නොවැ.', 'දෙසැ.'];

export const money = (n: number) => `රු. ${Math.round(n).toLocaleString()}`;

const pad = (n: number) => String(n).padStart(2, '0');

export const ago = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `තත්. ${s}කට පෙර`;
  const m = Math.floor(s / 60);
  if (m < 60) return `මිනි. ${m}කට පෙර`;
  const h = Math.floor(m / 60);
  if (h < 24) return `පැය ${h}කට පෙර`;
  return `දින ${Math.floor(h / 24)}කට පෙර`;
};

export const countdown = (ms: number) => {
  if (ms <= 0) return 'කල් ඉකුත් විය';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}m ${pad(s)}s`;
};

export const formatDate = (t: number) => {
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

export const formatTime = (t: number) => {
  const d = new Date(t);
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'පෙ.ව.' : 'ප.ව.'}`;
};

export const isSameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
