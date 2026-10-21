import React from 'react';
import { Platform, StyleSheet, Text, type TextStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors } from '../theme/colors';

/**
 * Every emoji that has a line icon below is drawn as that icon wherever it appears in a <Text>: the same rounded line style as the bottom
 * navigation bar, in the text's own colour. One patch on Text here instead of a change in every screen. Emoji without an entry stay as they are.
 */

/** A circle as a path. */
const c = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

type Def = { d: string[]; fill?: string };

const CLOCK: Def = { d: [c(12, 12, 9), 'M12 7v5l3 2'] };
const PHONE: Def = { d: ['M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z'] };
const MOBILE: Def = { d: ['M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z', 'M11 18h2'] };
const WARN: Def = { d: ['M12 3.5L2.5 20h19z', 'M12 10v4.5', 'M12 17.5v.1'] };
const SHOP: Def = { d: ['M3.5 9.5L5 4h14l1.5 5.5', 'M3.5 9.5a2.8 2.8 0 005.5 0 2.8 2.8 0 006 0 2.8 2.8 0 005.5 0', 'M5 11v9h14v-9', 'M10 20v-5h4v5'] };
const BUILDING: Def = { d: ['M5 21V4h9v17', 'M14 9h5v12', 'M8 8h3M8 12h3M8 16h3', 'M3 21h18'] };
const HOME: Def = { d: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'] };
const WRENCH: Def = { d: ['M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z'] };
const COIN: Def = { d: [c(12, 12, 9), 'M12 6.5v11', 'M14.8 9.3c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2 0 1.3 1.2 1.7 2.8 2.1 1.6.4 2.8.8 2.8 2.1 0 1.2-1.2 2-2.8 2-1.3 0-2.4-.6-2.9-1.5'] };
const CAR: Def = { d: ['M3 17v-4l2-5h14l2 5v4', 'M3 13h18', c(7.5, 17, 1.8), c(16.5, 17, 1.8)] };
const BIKE: Def = { d: [c(6, 17, 3), c(18, 17, 3), 'M6 17l4-6h5l3 6', 'M10 11l-1-3H7', 'M14 8h3'] };
const TRUCK: Def = { d: ['M2 6h12v11H2z', 'M14 10h4l4 3v4h-8', c(6.5, 18, 2), c(17.5, 18, 2)] };
const MAIL: Def = { d: ['M3 5h18v14H3z', 'M3 6l9 7 9-7'] };
const SHIELD: Def = { d: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M8.5 12l2.5 2.5 4.5-5'] };
const SEARCH: Def = { d: [c(11, 11, 7), 'M21 21l-4.5-4.5'] };
const MEGA: Def = { d: ['M4 10v4h3l8 4V6L7 10z', 'M18 9a4 4 0 010 6'] };
const CHAT: Def = { d: ['M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z'] };
const LOCK: Def = { d: ['M5 11h14v10H5z', 'M8 11V8a4 4 0 018 0v3'] };
const BAG: Def = { d: ['M5 8h14l-1 12H6z', 'M9 8V6a3 3 0 016 0v2'] };
const BOX: Def = { d: ['M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z', 'M3.5 7.5L12 12l8.5-4.5', 'M12 12v9'] };
const CROSS: Def = { d: ['M6 6l12 12M18 6L6 18'] };
const CAL: Def = { d: ['M4 6h16v14H4z', 'M4 10.5h16', 'M8 3.5v4M16 3.5v4', 'M8 14h2M14 14h2'] };
const BAN: Def = { d: [c(12, 12, 9), 'M5.6 5.6l12.8 12.8'] };
const USER: Def = { d: [c(12, 8, 4), 'M4.5 21c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5'] };
const DOC: Def = { d: ['M6 3h8l5 5v13H6z', 'M14 3v5h5', 'M9.5 13h6M9.5 17h4'] };
const PENCIL: Def = { d: ['M4 20l1-4L16 5l3 3L8 19z', 'M14 7l3 3'] };
const CHECKCIRCLE: Def = { d: [c(12, 12, 9), 'M8 12.5l3 3 5-6'] };
const SUN: Def = { d: [c(12, 12, 4), 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4'] };
const STAR: Def = { d: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'] };
const DOT = (fill: string): Def => ({ d: [c(12, 12, 6)], fill });

const MAP: Record<string, Def> = {
  '✅': CHECKCIRCLE,
  '☑': { d: ['M4 4h16v16H4z', 'M8 12l3 3 5-6'] },
  '🔩': { d: ['M12 3l7 4v8l-7 4-7-4V7z', c(12, 11, 2.5)] },
  '📍': { d: ['M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z', c(12, 10, 2.5)] },
  '⏳': { d: ['M6 3h12M6 21h12M7 3v3.5L12 12l-5 5.5V21M17 3v3.5L12 12l5 5.5V21'] },
  '⌛': { d: ['M6 3h12M6 21h12M7 3v3.5L12 12l-5 5.5V21M17 3v3.5L12 12l5 5.5V21'] },
  '📞': PHONE,
  '☎': PHONE,
  '📱': MOBILE,
  '📲': MOBILE,
  '⚠': WARN,
  '🏪': SHOP,
  '🏢': BUILDING,
  '🏭': BUILDING,
  '🏠': HOME,
  '🔧': WRENCH,
  '🛠': WRENCH,
  '🔨': WRENCH,
  '⚙': { d: [c(12, 12, 6.5), c(12, 12, 2.4), 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4'] },
  '💰': COIN,
  '💵': COIN,
  '💳': { d: ['M3 6h18v12H3z', 'M3 10h18', 'M6 15h4'] },
  '💎': { d: ['M6 4h12l4 5-10 12L2 9z', 'M2 9h20', 'M9 4l-2 5 5 12 5-12-2-5'] },
  '🚗': CAR,
  '🚙': CAR,
  '🚘': CAR,
  '🚑': CAR,
  '🚓': CAR,
  '🚒': TRUCK,
  '🛵': BIKE,
  '🏍': BIKE,
  '🛺': { d: ['M3 16V9h9l3 4h4v3', c(7, 17, 2), c(17, 17, 2)] },
  '🚐': TRUCK,
  '🚚': TRUCK,
  '🚛': TRUCK,
  '🛻': TRUCK,
  '📨': MAIL,
  '✉': MAIL,
  '📤': { d: ['M12 16V4M7 9l5-5 5 5', 'M4 16v4h16v-4'] },
  '📥': { d: ['M12 4v12M7 11l5 5 5-5', 'M4 16v4h16v-4'] },
  '🛡': SHIELD,
  '🔍': SEARCH,
  '🔎': SEARCH,
  '🔭': SEARCH,
  '📣': MEGA,
  '📢': MEGA,
  '💬': CHAT,
  '🙋': CHAT,
  '🔒': LOCK,
  '🔓': { d: ['M5 11h14v10H5z', 'M8 11V8a4 4 0 017.5-2'] },
  '🔑': { d: [c(8, 15, 4), 'M11 12l9-9', 'M16 7l2 2', 'M14 9l2 2'] },
  '🛍': BAG,
  '🛒': { d: ['M3 4h3l2.5 11h9.5l2-8H7', c(10, 19, 1.3), c(17, 19, 1.3)] },
  '📦': BOX,
  '✖': CROSS,
  '❌': CROSS,
  '❎': CROSS,
  '✕': CROSS,
  '➕': { d: ['M12 5v14M5 12h14'] },
  '↩': { d: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 010 12h-3'] },
  '➡': { d: ['M5 12h14M13 6l6 6-6 6'] },
  '↗': { d: ['M7 17L17 7M8 7h9v9'] },
  '↔': { d: ['M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4'] },
  '⬆': { d: ['M12 19V5M6 11l6-6 6 6'] },
  '🔁': { d: ['M4 12a8 8 0 0113-6l3 3', 'M20 4v5h-5', 'M20 12a8 8 0 01-13 6l-3-3', 'M4 20v-5h5'] },
  '♻': { d: ['M4 12a8 8 0 0113-6l3 3', 'M20 4v5h-5', 'M20 12a8 8 0 01-13 6l-3-3', 'M4 20v-5h5'] },
  '📷': { d: ['M3 8h4l2-3h6l2 3h4v12H3z', c(12, 13, 3.5)] },
  '📸': { d: ['M3 8h4l2-3h6l2 3h4v12H3z', c(12, 13, 3.5)] },
  '🚨': { d: ['M7 18v-6a5 5 0 0110 0v6', 'M5 18h14v3H5z', 'M12 3v2M4 8l1.5 1M20 8l-1.5 1'] },
  '⭐': STAR,
  '🌟': STAR,
  '🏆': { d: ['M8 4h8v6a4 4 0 01-8 0z', 'M8 6H4v2a3 3 0 003 3M16 6h4v2a3 3 0 01-3 3', 'M12 14v4M8 21h8M10 18h4'] },
  '🏅': { d: [c(12, 15, 5), 'M9 3l3 6 3-6'] },
  '👑': { d: ['M3 8l4 4 5-7 5 7 4-4-2 11H5z'] },
  '🎁': { d: ['M4 10h16v10H4z', 'M3 7h18v3H3z', 'M12 7v13', 'M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0'] },
  '📅': CAL,
  '🗓': CAL,
  '🏷': { d: ['M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z', c(7, 7, 0.8)] },
  '🤝': { d: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', c(9, 7, 4), 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'] },
  '👥': { d: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', c(9, 7, 4), 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'] },
  '⛔': BAN,
  '🚫': BAN,
  '🛑': { d: ['M8 3h8l5 5v8l-5 5H8l-5-5V8z', 'M12 8v5', 'M12 16v.1'] },
  '🗺': { d: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14M15 6v14'] },
  '🧭': { d: [c(12, 12, 9), 'M15.5 8.5l-2 5-5 2 2-5z'] },
  '📡': { d: ['M5 12a10 10 0 0114 0', 'M8 15a6 6 0 018 0', c(12, 18, 1)] },
  '📶': { d: ['M5 12a10 10 0 0114 0', 'M8 15a6 6 0 018 0', c(12, 18, 1)] },
  '⏱': CLOCK,
  '⏲': CLOCK,
  '🕗': CLOCK,
  '🕘': CLOCK,
  '🕒': CLOCK,
  '⏰': { d: [c(12, 13, 8), 'M12 9v4l2.5 1.5', 'M4 5l3-2M20 5l-3-2'] },
  '🔋': { d: ['M3 8h15v8H3z', 'M21 11v2', 'M6 11v2M9 11v2'] },
  '🔌': { d: ['M9 3v5M15 3v5', 'M7 8h10v4a5 5 0 01-10 0z', 'M12 17v4'] },
  '⚡': { d: ['M13 2L4 14h7l-1 8 9-12h-7z'] },
  '💡': { d: ['M9 18h6M10 21h4', 'M12 3a6 6 0 00-3.5 11c.6.5 1 1.2 1 2h5c0-.8.4-1.5 1-2A6 6 0 0012 3z'] },
  '🧾': { d: ['M6 2h12v20l-3-2-3 2-3-2-3 2z', 'M9 8h6M9 12h6'] },
  '📄': DOC,
  '📝': PENCIL,
  '✏': PENCIL,
  '📋': { d: ['M5 5.5A1.5 1.5 0 016.5 4h11A1.5 1.5 0 0119 5.5v14a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.5z', 'M9 4h6v3H9z', 'M9 12h6M9 16h4'] },
  '🗂': { d: ['M3 6h6l2 2h10v12H3z'] },
  '📚': { d: ['M4 5a2 2 0 012-2h13v15H6a2 2 0 00-2 2z', 'M4 20a2 2 0 002 1h13v-3'] },
  '🧰': { d: ['M3 8h18v12H3z', 'M9 8V5h6v3', 'M3 13h18', 'M10.5 13v2h3v-2'] },
  '🎙': { d: ['M9 4a3 3 0 016 0v7a3 3 0 01-6 0z', 'M5 11a7 7 0 0014 0', 'M12 18v3'] },
  '🔊': { d: ['M4 9v6h4l5 4V5L8 9z', 'M16 9a4 4 0 010 6'] },
  '⚖': { d: ['M12 3v18', 'M7 21h10', 'M4 6h16', 'M6 6l-3 8h6zM18 6l-3 8h6z'] },
  '👤': USER,
  '🧑': USER,
  '🙂': USER,
  '👨‍🔧': USER,
  '🧑‍🔧': USER,
  '👷': USER,
  '🔳': { d: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z', 'M14 14h3v3h-3zM19 14v6M14 20h3'] },
  '🛢': { d: ['M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3'] },
  '☀': SUN,
  '🌙': { d: ['M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z'] },
  '🌅': { d: ['M3 18h18', 'M7 18a5 5 0 0110 0', 'M12 6v3M4.5 10.5l2 1.5M19.5 10.5l-2 1.5'] },
  '☁': { d: ['M7 18a4.5 4.5 0 01-.5-9 6 6 0 0111.5 1.5A3.8 3.8 0 0117 18z'] },
  '❄': { d: ['M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7'] },
  '🌡': { d: ['M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0z'] },
  '🤖': { d: ['M5 8h14v10H5z', 'M12 4v4', c(9, 13, 1), c(15, 13, 1), 'M9 16h6'] },
  '❓': { d: [c(12, 12, 9), 'M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2', 'M12 17v.1'] },
  'ℹ': { d: [c(12, 12, 9), 'M12 11v5', 'M12 8v.1'] },
  '👍': { d: ['M7 11v9H3v-9z', 'M7 11l4-8c1.7 0 2.5 1.3 2.2 3L12.8 9H19a2 2 0 012 2.3l-1.2 7A2 2 0 0118 20H7'] },
  '♥': { d: ['M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z'] },
  '❤': { d: ['M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z'] },
  '☕': { d: ['M4 9h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4z', 'M16 10h2a2 2 0 010 4h-2', 'M7 3v3M11 3v3'] },
  '🚪': { d: ['M6 21V4h10v17', 'M4 21h14', 'M13 12v.1'] },
  '🔔': { d: ['M6 17V11a6 6 0 0112 0v6l2 2H4z', 'M10 21h4'] },
  '🗑': { d: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 14h10l1-14', 'M10 11v6M14 11v6'] },
  '⏸': { d: ['M8 5v14M16 5v14'] },
  '▶': { d: ['M7 4l13 8-13 8z'] },
  '⏹': { d: ['M6 6h12v12H6z'] },
  '🟢': DOT('#22c55e'),
  '🟡': DOT('#facc15'),
  '🔴': DOT('#ef4444'),
  '⚪': DOT('#d1d5db'),
  '✨': { d: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'] },
  '🎉': { d: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'] },
  '🌐': { d: [c(12, 12, 9), 'M3 12h18', 'M12 3a14 14 0 010 18 14 14 0 010-18'] },
  '💻': { d: ['M4 5h16v11H4z', 'M2 19h20'] },
  '🖼': { d: ['M3 4h18v16H3z', c(8.5, 9.5, 1.5), 'M3 17l5-5 4 4 3-3 6 6'] },
  '🎬': { d: ['M3 6h12v12H3z', 'M15 10l6-3v10l-6-3'] },
  '📹': { d: ['M3 6h12v12H3z', 'M15 10l6-3v10l-6-3'] },
  '🛞': { d: [c(12, 12, 9), c(12, 12, 3.5)] },
  '🛣': { d: ['M8 3L4 21M16 3l4 18M12 4v3M12 11v3M12 18v3'] },
  '⛽': { d: ['M5 21V4h8v17', 'M3 21h12', 'M13 9h3a2 2 0 012 2v6a1.5 1.5 0 003 0V8l-3-3', 'M7 8h4'] },
  '📏': { d: ['M3 15l12-12 6 6L9 21z', 'M7 11l2 2M10 8l2 2M13 5l2 2'] },
  '📈': { d: ['M3 20h18', 'M6 16l4-5 3 3 5-7'] },
  '📉': { d: ['M3 20h18', 'M6 8l4 5 3-3 5 7'] },
  '📊': { d: ['M5 20V11M12 20V4M19 20v-6'] },
  '🔖': { d: ['M6 3h12v18l-6-4-6 4z'] },
  '🔗': { d: ['M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1', 'M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1'] },
  '⛓': { d: ['M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1', 'M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1'] },
  '🪪': { d: ['M3 5h18v14H3z', c(9, 11, 2), 'M14 10h4M14 14h3', 'M6 16c.5-2 5.5-2 6 0'] },
  '📭': { d: ['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z'] },
};

const strip = (s: string) => s.replace(/️/g, '');
const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// An emoji may carry the variation selector (U+FE0F); it is dropped before the lookup.
const PATTERN = new RegExp(`(${keys.map((k) => `${escape(k)}\\uFE0F?`).join('|')})`, 'g');

const webStyle = Platform.OS === 'web' ? ({ verticalAlign: '-0.2em' } as object) : undefined;

const EmojiLine: React.FC<{ emoji: string; size: number; color: string }> = ({ emoji, size, color }) => {
  const def = MAP[strip(emoji)];
  if (!def) return <>{emoji}</>;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={webStyle}>
      {def.fill && <Circle cx={12} cy={12} r={7} fill={def.fill} stroke="none" />}
      {!def.fill && def.d.map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
};

const swap = (children: React.ReactNode, size: number, color: string): React.ReactNode => {
  const one = (node: React.ReactNode, key?: number): React.ReactNode => {
    if (typeof node !== 'string') return node;
    PATTERN.lastIndex = 0;
    if (!PATTERN.test(node)) return node;
    PATTERN.lastIndex = 0;
    return node.split(PATTERN).map((part, i) => (i % 2 === 1 ? <EmojiLine key={`${key ?? 0}-${i}`} emoji={part} size={size} color={color} /> : part));
  };
  if (typeof children === 'string') return one(children);
  if (Array.isArray(children)) return children.map((ch, i) => (typeof ch === 'string' ? <React.Fragment key={i}>{one(ch, i)}</React.Fragment> : ch));
  return children;
};

const patchable = Text as unknown as { render?: (props: Record<string, unknown>, ref: unknown) => React.ReactElement; __emojiLine?: boolean };
if (patchable.render && !patchable.__emojiLine) {
  const original = patchable.render;
  patchable.__emojiLine = true;
  patchable.render = function render(props, ref) {
    // A Text marked `keepEmoji` shows its emoji as they are.
    if (props.keepEmoji) {
      const { keepEmoji: _keep, ...rest } = props;
      return original.call(this, rest, ref);
    }
    const children = props.children as React.ReactNode;
    const has = typeof children === 'string' ? children : Array.isArray(children) ? children.find((x) => typeof x === 'string') : undefined;
    if (has === undefined) return original.call(this, props, ref);
    const flat = (StyleSheet.flatten(props.style as never) ?? {}) as TextStyle;
    const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
    const color = typeof flat.color === 'string' ? flat.color : Colors.textMain;
    return original.call(this, { ...props, children: swap(children, Math.round(fontSize * 1.15), color) }, ref);
  };
}
