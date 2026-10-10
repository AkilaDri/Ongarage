import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { themedStyles } from '@ongarage/shared';

/** The four parts of the day, each with its own sky, light and skyline: morning (ude), daytime (dahawala), evening (hendewa), night (rathriya). */
export type Period = 'morning' | 'day' | 'evening' | 'night';
export const periodOf = (hour: number): Period => (hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 16 ? 'day' : hour >= 16 && hour < 19 ? 'evening' : 'night');
export const SKY: Record<Period, string> = { morning: '#ffd8b4', day: '#a9dcf7', evening: '#f8b878', night: '#10213f' };

/**
 * The sun as a 3D symbol: a glossy sphere (light from the top left: a bright highlight, a deep rim and a soft shadow on the
 * far side) with round-ended rays that each cast a small shadow, and a faint halo. `evening` tints it orange-red as it sets.
 */
const Sun: React.FC<{ size: number; evening?: boolean }> = ({ size, evening }) => {
  const id = evening ? 'Eve' : 'Day';
  const c = evening
    ? { halo: '#ff9a52', hi: '#fff0d2', mid1: '#ffb067', mid2: '#ff7a33', edge: '#c8401c', ray: '#ff9a52', rayShade: '#b3401f' }
    : { halo: '#ffd666', hi: '#fffde0', mid1: '#ffe566', mid2: '#ffb300', edge: '#d97500', ray: '#ffc21f', rayShade: '#c76a00' };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`sunGlow${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0.4" stopColor={c.halo} stopOpacity={0.4} />
          <Stop offset="1" stopColor={c.halo} stopOpacity={0} />
        </RadialGradient>
        {/* the sphere: the focus sits up and to the left, where the light hits */}
        <RadialGradient id={`sunSphere${id}`} cx="46%" cy="46%" fx="34%" fy="30%" r="62%">
          <Stop offset="0" stopColor={c.hi} />
          <Stop offset="0.3" stopColor={c.mid1} />
          <Stop offset="0.7" stopColor={c.mid2} />
          <Stop offset="1" stopColor={c.edge} />
        </RadialGradient>
        {/* shade on the side facing away from the light */}
        <RadialGradient id={`sunShade${id}`} cx="30%" cy="28%" r="85%">
          <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor={c.edge} stopOpacity={0.55} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill={`url(#sunGlow${id})`} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const x1 = 50 + Math.cos(a) * 29;
        const y1 = 50 + Math.sin(a) * 29;
        const x2 = 50 + Math.cos(a) * (i % 2 === 0 ? 44 : 38);
        const y2 = 50 + Math.sin(a) * (i % 2 === 0 ? 44 : 38);
        return (
          <React.Fragment key={i}>
            {/* the ray's shadow, nudged away from the light */}
            <Line x1={x1 + 1.6} y1={y1 + 2} x2={x2 + 1.6} y2={y2 + 2} stroke={c.rayShade} strokeOpacity={0.45} strokeWidth={5.5} strokeLinecap="round" />
            <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.ray} strokeWidth={5.5} strokeLinecap="round" />
            {/* a thin highlight along the lit edge */}
            <Line x1={x1 - 0.7} y1={y1 - 0.9} x2={x2 - 0.7} y2={y2 - 0.9} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
          </React.Fragment>
        );
      })}
      {/* the sphere casts a soft shadow onto the rays behind it */}
      <Circle cx={52.5} cy={54} r={22.5} fill={c.rayShade} fillOpacity={0.3} />
      <Circle cx={50} cy={50} r={22} fill={`url(#sunSphere${id})`} />
      <Circle cx={50} cy={50} r={22} fill={`url(#sunShade${id})`} />
      {/* a glossy highlight */}
      <Ellipse cx={42} cy={41} rx={8} ry={5.2} fill="#ffffff" fillOpacity={0.7} transform="rotate(-35 42 41)" />
      <Circle cx={57.5} cy={60} r={2.2} fill="#ffffff" fillOpacity={0.25} />
    </Svg>
  );
};

type Skyline = { tones: string[]; ink: string; win: string; front: string; frontWin: string; ground: string; dome: string; stupaBase: string; stupa: string; gold: string };
const SKYLINE: Record<Period, Skyline> = {
  morning: { tones: ['#d49a82', '#dca58b', '#c98d78', '#e0b094'], ink: '#7a4a40', win: '#fff0b8', front: '#8a6260', frontWin: '#ffe6a8', ground: '#654544', dome: '#efc7b0', stupaBase: '#e8c9b8', stupa: '#fff3e8', gold: '#f0b648' },
  day: { tones: ['#8396b0', '#92a5bf', '#7689a4', '#a0b2c8'], ink: '#43587a', win: '#cfeaff', front: '#52678a', frontWin: '#bfe3ff', ground: '#3d5273', dome: '#b8c8dc', stupaBase: '#cfd9e6', stupa: '#f4f8fd', gold: '#e8b24a' },
  evening: { tones: ['#8a4a47', '#9a5851', '#7f4545', '#a3665c'], ink: '#5a2a30', win: '#ffd070', front: '#3a1f26', frontWin: '#e8a85a', ground: '#2c171d', dome: '#c98a7a', stupaBase: '#d9b8a8', stupa: '#f6e6dc', gold: '#e8b24a' },
  night: { tones: ['#27345c', '#2e3d68', '#222e55', '#34436f'], ink: '#0a1128', win: '#ffd866', front: '#0f1733', frontWin: '#ffd866', ground: '#080d20', dome: '#3a4878', stupaBase: '#2a355c', stupa: '#4a5a8c', gold: '#d9a53f' },
};

/** The skyline on the horizon in the colours of the time of day: buildings of all heights in two layers (a paler one behind a darker one). */
const TreeLine: React.FC<{ width: number; period: Period }> = ({ width, period }) => {
  const pal = SKYLINE[period];
  const h = 72;
  const ink = pal.ink;
  const noise = (i: number, k: number) => (((i + 3) * 37 + k * 19) % 23) / 23;
  const back: React.ReactNode[] = [];
  const front: React.ReactNode[] = [];

  // Back layer: a varied skyline - glass towers, a stepped tower, twin towers, a slope-roofed hotel, a domed building and a
  // stupa - in a few brick tones, with lit windows in grids.
  const tones = pal.tones;
  const lit = (key: string, x: number, y: number, cols: number, rows: number, gap = 4.2) => {
    const out: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r * 3 + c * 5 + Math.round(x)) % 4 === 0) continue; // a few windows stay dark
        out.push(<Rect key={`${key}-${r}-${c}`} x={x + c * gap} y={y + r * gap} width={2} height={2.5} fill={pal.win} />);
      }
    }
    return out;
  };
  let x = -4;
  for (let i = 0; x < width + 20; i++) {
    const kind = (i * 5 + (i >> 1)) % 8;
    const fill = tones[(i * 3 + kind) % tones.length];
    const key = `b${i}`;
    if (kind === 0 || kind === 4) {
      // a glass tower with a grid of windows and an antenna
      const bw = 12 + noise(i, 2) * 4;
      const bh = 26 + noise(i, 3) * 14;
      back.push(<Rect key={key} x={x} y={h - bh} width={bw} height={bh} fill={fill} stroke={ink} strokeWidth={0.7} />);
      back.push(<Path key={`${key}a`} d={`M${x + bw / 2} ${h - bh} V${h - bh - 5}`} stroke={ink} strokeWidth={0.9} />);
      back.push(...lit(key, x + 2.2, h - bh + 4, 2, Math.floor((bh - 6) / 4.2)));
      x += bw + 3;
    } else if (kind === 1) {
      // a stepped tower
      const bw = 16;
      const bh = 24 + noise(i, 3) * 8;
      back.push(<Rect key={key} x={x} y={h - bh * 0.6} width={bw} height={bh * 0.6} fill={fill} stroke={ink} strokeWidth={0.7} />);
      back.push(<Rect key={`${key}u`} x={x + 3.5} y={h - bh} width={bw - 7} height={bh * 0.4 + 0.5} fill={fill} stroke={ink} strokeWidth={0.7} />);
      back.push(...lit(key, x + 2, h - bh * 0.6 + 4, 3, 2, 4.4));
      back.push(...lit(`${key}u`, x + 5.4, h - bh + 3, 1, 2, 4.2));
      x += bw + 3;
    } else if (kind === 2) {
      // twin towers
      const bh = 30 + noise(i, 3) * 8;
      back.push(<Rect key={key} x={x} y={h - bh} width={8} height={bh} fill={fill} stroke={ink} strokeWidth={0.7} />);
      back.push(<Rect key={`${key}t`} x={x + 10} y={h - bh + 5} width={8} height={bh - 5} fill={tones[(i + 1) % tones.length]} stroke={ink} strokeWidth={0.7} />);
      back.push(<Rect key={`${key}c`} x={x + 8} y={h - bh * 0.55} width={2} height={2.2} fill={pal.win} />);
      back.push(...lit(key, x + 2, h - bh + 4, 1, Math.floor((bh - 6) / 4.2)));
      back.push(...lit(`${key}t`, x + 12, h - bh + 9, 1, Math.floor((bh - 11) / 4.2)));
      x += 21;
    } else if (kind === 3 || kind === 7) {
      // a hotel with a sloping roof
      const bw = 18;
      const bh = 16 + noise(i, 3) * 8;
      back.push(<Path key={key} d={`M${x} ${h} V${h - bh} L${x + bw} ${h - bh - 7} V${h}Z`} fill={fill} stroke={ink} strokeWidth={0.7} />);
      back.push(...lit(key, x + 2.4, h - bh + 2, 4, 3, 3.9));
      x += bw + 3;
    } else if (kind === 5) {
      // a domed building
      const bw = 16;
      const bh = 14 + noise(i, 3) * 5;
      back.push(<Rect key={key} x={x} y={h - bh} width={bw} height={bh} fill={fill} stroke={ink} strokeWidth={0.7} />);
      back.push(<Path key={`${key}d`} d={`M${x + 2.5} ${h - bh} A${bw / 2 - 2.5} ${bw / 2 - 2.5} 0 0 1 ${x + bw - 2.5} ${h - bh}Z`} fill={pal.dome} stroke={ink} strokeWidth={0.7} />);
      back.push(<Path key={`${key}f`} d={`M${x + bw / 2} ${h - bh - 7.5} V${h - bh - 11}`} stroke={ink} strokeWidth={0.9} />);
      back.push(...lit(key, x + 3, h - bh + 3, 3, 2, 4.4));
      x += bw + 3;
    } else {
      // a white stupa
      const bw = 18;
      back.push(<Rect key={key} x={x + 1} y={h - 4} width={bw - 2} height={4} fill={pal.stupaBase} stroke={ink} strokeWidth={0.6} />);
      back.push(<Path key={`${key}s`} d={`M${x + 2.5} ${h - 4} A${bw / 2 - 2.5} ${bw / 2 - 2.5} 0 0 1 ${x + bw - 2.5} ${h - 4}Z`} fill={pal.stupa} stroke={ink} strokeWidth={0.7} />);
      back.push(<Path key={`${key}p`} d={`M${x + bw / 2 - 1.6} ${h - 4 - (bw / 2 - 2.5)} L${x + bw / 2} ${h - 4 - (bw / 2 - 2.5) - 8} L${x + bw / 2 + 1.6} ${h - 4 - (bw / 2 - 2.5)}Z`} fill={pal.gold} stroke={ink} strokeWidth={0.6} />);
      x += bw + 3;
    }
  }

  // Front layer: low, dark buildings - flat blocks, pitched roofs and water tanks.
  const stepFront = 20;
  for (let i = 0; i * stepFront < width + 20; i++) {
    const fx = i * stepFront + 4;
    const fw = 12 + noise(i, 4) * 6;
    const fh = 9 + noise(i, 5) * 11;
    const kind = i % 4;
    const key = `f${i}`;
    if (kind === 1) {
      front.push(<Path key={key} d={`M${fx} ${h} V${h - fh} L${fx + fw / 2} ${h - fh - 6} L${fx + fw} ${h - fh} V${h}Z`} fill={pal.front} />);
    } else {
      front.push(<Rect key={key} x={fx} y={h - fh} width={fw} height={fh} fill={pal.front} />);
      if (kind === 3) front.push(<Rect key={`${key}t`} x={fx + fw - 6} y={h - fh - 4} width={4.5} height={4} rx={1} fill={pal.front} />);
    }
    if (i % 2 === 0) front.push(<Rect key={`${key}w`} x={fx + 2.4} y={h - fh + 3.6} width={2} height={2.4} fill={pal.frontWin} opacity={0.85} />);
  }

  return (
    <Svg width={width} height={h} style={{ position: 'absolute', left: 0, bottom: 0 }}>
      {back}
      {front}
      <Rect x={0} y={h - 7} width={width} height={7} fill={pal.ground} />
    </Svg>
  );
};

/** The sun / moon for each period: where it hangs (a fraction of the band's height from the bottom) and the colours its light fades through. */
const LUMINARY: Record<Period, { emoji: string; bottom: number; stops: [string, string, string]; fade: string; strength: number }> = {
  morning: { emoji: '☀️', bottom: 30, stops: ['#fff6da', '#ffe0a8', '#ffc08a'], fade: '#ffa96b', strength: 1 },
  day: { emoji: '☀️', bottom: 42, stops: ['#ffffff', '#fff7cc', '#cfeaff'], fade: '#a9dcf7', strength: 1 },
  evening: { emoji: '☀️', bottom: 44, stops: ['#fffbe0', '#ffe9a0', '#ffc46b'], fade: '#ff9a52', strength: 1 },
  night: { emoji: '🌙', bottom: 46, stops: ['#f6f8ff', '#c4d4ff', '#7d97e0'], fade: '#4a62b0', strength: 0.75 },
};
const Luminary: React.FC<{ period: Period; width: number }> = ({ period, width }) => {
  const l = LUMINARY[period];
  const cx = width * 0.56 + 40;
  const id = `light-${period}`;
  return (
    <>
      {/* the light spreads out from it into the sky and fades into the sky's own colour */}
      <Svg width={230} height={150} style={{ position: 'absolute', left: cx - 115, bottom: l.bottom - 75 + 16 }} pointerEvents="none">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0" stopColor={l.stops[0]} stopOpacity={0.95 * l.strength} />
            <Stop offset="0.25" stopColor={l.stops[1]} stopOpacity={0.7 * l.strength} />
            <Stop offset="0.6" stopColor={l.stops[2]} stopOpacity={0.3 * l.strength} />
            <Stop offset="1" stopColor={l.fade} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={230} height={150} fill={`url(#${id})`} />
      </Svg>
      <Text style={{ position: 'absolute', left: cx - 17, bottom: l.bottom, fontSize: 32 }}>{l.emoji}</Text>
    </>
  );
};

/** The setting sun as a cartoon: a chunky outlined disc with round-ended rays, a sleepy smile and rosy cheeks. */
const CartoonSun: React.FC<{ size: number }> = ({ size }) => {
  const ink = '#7a2f12';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {Array.from({ length: 10 }, (_, i) => {
        const a = ((i * 36 - 90) * Math.PI) / 180;
        const x1 = 50 + Math.cos(a) * 35;
        const y1 = 50 + Math.sin(a) * 35;
        const x2 = 50 + Math.cos(a) * 47;
        const y2 = 50 + Math.sin(a) * 47;
        return (
          <React.Fragment key={i}>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={11} strokeLinecap="round" />
            <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ff8a2a" strokeWidth={6.5} strokeLinecap="round" />
          </React.Fragment>
        );
      })}
      <Circle cx={50} cy={50} r={29} fill="#ffb02e" stroke={ink} strokeWidth={4} />
      <Path d="M31 40 Q36 31 45 29" stroke="#fff2b8" strokeWidth={4} strokeLinecap="round" fill="none" />
      {/* happy, half-asleep eyes */}
      <Path d="M36 47 Q41 41 46 47" stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      <Path d="M54 47 Q59 41 64 47" stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      <Path d="M42 57 Q50 66 58 57" stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      <Ellipse cx={33.5} cy={56.5} rx={4.6} ry={3} fill="#ff6b4a" opacity={0.6} />
      <Ellipse cx={66.5} cy={56.5} rx={4.6} ry={3} fill="#ff6b4a" opacity={0.6} />
    </Svg>
  );
};

/** A bird in flight: two curved wings in a soft "v". */
const Bird: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size * 0.5} viewBox="0 0 28 14">
    <Path d="M1.5 4.5Q7 0.5 14 8Q21 0.5 26.5 4.5" stroke="#1f3a5c" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/**
 * The sky's animation values live here, not in each band: the loops start the first time a sky is shown and keep running
 * for as long as the app is open, so changing tab, opening a window or coming back to a page never restarts the clouds,
 * birds, stars or setting sun - they carry on from where they were.
 */
const sky = {
  cloudA: new Animated.Value(0),
  cloudB: new Animated.Value(0),
  cloudC: new Animated.Value(0),
  sun: new Animated.Value(0),
  birdA: new Animated.Value(0),
  birdB: new Animated.Value(0),
  flap: new Animated.Value(0),
  twinkleA: new Animated.Value(0),
  twinkleB: new Animated.Value(0),
  bob: new Animated.Value(0),
};
/**
 * Every layer is a pure function of the clock: one ticker works out where each cycle is from the time of day and sets the
 * values. Nothing depends on an animation staying alive (React Native stops an animated value's animation when the view using
 * it is removed, e.g. when the tab and its top bar change), so the sky can never stall; a band that appears later is simply
 * in step with the others. The ticker runs while any sky is on screen.
 */
type Wave = 'saw' | 'sine' | 'ease';
const LAYERS: { key: keyof typeof sky; period: number; wave: Wave; offset: number }[] = [
  { key: 'cloudA', period: 26000, wave: 'saw', offset: 0 },
  { key: 'cloudB', period: 38000, wave: 'saw', offset: 0.5 },
  { key: 'cloudC', period: 32000, wave: 'saw', offset: 0.8 },
  { key: 'sun', period: 16000, wave: 'ease', offset: 0 },
  { key: 'birdA', period: 17000, wave: 'saw', offset: 0.1 },
  { key: 'birdB', period: 23000, wave: 'saw', offset: 0.6 },
  { key: 'flap', period: 520, wave: 'sine', offset: 0 },
  { key: 'twinkleA', period: 2200, wave: 'sine', offset: 0 },
  { key: 'twinkleB', period: 3400, wave: 'sine', offset: 0 },
  { key: 'bob', period: 5200, wave: 'sine', offset: 0 },
];
const waveAt = (wave: Wave, phase: number) =>
  wave === 'sine' ? 0.5 - 0.5 * Math.cos(phase * Math.PI * 2) : wave === 'ease' ? (phase < 0.5 ? 2 * phase * phase : 1 - Math.pow(-2 * phase + 2, 2) / 2) : phase;

let skyUsers = 0;
let skyFrame: ReturnType<typeof requestAnimationFrame> | null = null;
const skyTick = () => {
  const now = Date.now();
  for (const l of LAYERS) sky[l.key].setValue(waveAt(l.wave, (now / l.period + l.offset) % 1));
  skyFrame = requestAnimationFrame(skyTick);
};
/** Keeps the sky moving while a band that shows it is mounted. */
const useSkyClock = () => {
  useEffect(() => {
    skyUsers += 1;
    if (skyUsers === 1) skyTick();
    return () => {
      skyUsers -= 1;
      if (skyUsers === 0 && skyFrame !== null) {
        cancelAnimationFrame(skyFrame);
        skyFrame = null;
      }
    };
  }, []);
};

/** The hour of the day, kept current while the app stays open (so the sky changes from day to evening to night by itself). */
export const useHour = () => {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 30000);
    return () => clearInterval(id);
  }, []);
  return hour;
};

/**
 * The sky behind the whole greeting band (it fills its parent). Daytime: the sun with clouds drifting sideways.
 * Evening: the sun slowly sinking behind the horizon while clouds drift. Night: a moon, twinkling stars and a few
 * dim clouds.
 */
const WeatherAnimation: React.FC<{ hour: number }> = ({ hour }) => {
  const period = periodOf(hour);
  const [width, setWidth] = useState(360);
  useSkyClock();
  const { cloudA, cloudB, cloudC, sun, birdA, birdB, flap, twinkleA, twinkleB, bob } = sky;

  const drift = (v: Animated.Value) => ({ transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-48, width + 8] }) }] });
  const cloudOpacity = period === 'night' ? 0.3 : 0.6;
  const twinkle = (v: Animated.Value, from: number, to: number) => v.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View
      style={[styles.sky, { backgroundColor: SKY[period] }]}
      pointerEvents="none"
      accessibilityLabel={`Sky: ${period}`}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {(period === 'morning' || period === 'day') && (
        <>
          {/* birds gliding across in the daylight, wings beating */}
          <Animated.View style={[styles.bird, { top: 16, transform: [{ translateX: birdA.interpolate({ inputRange: [0, 1], outputRange: [-30, width + 10] }) }, { translateY: flap.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }]}>
            <Animated.View style={{ transform: [{ scaleY: flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) }] }}>
              <Bird size={26} />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[styles.bird, { top: 44, opacity: 0.8, transform: [{ translateX: birdB.interpolate({ inputRange: [0, 1], outputRange: [-30, width + 10] }) }, { translateY: flap.interpolate({ inputRange: [0, 1], outputRange: [-2, 1] }) }] }]}>
            <Animated.View style={{ transform: [{ scaleY: flap.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
              <Bird size={18} />
            </Animated.View>
          </Animated.View>
        </>
      )}
      {period === 'night' && (
        <>
          <Animated.Text style={[styles.star, { left: '12%', top: 14, opacity: twinkle(twinkleA, 0.25, 1) }]}>✦</Animated.Text>
          <Animated.Text style={[styles.star, { left: '38%', top: 58, fontSize: 9, opacity: twinkle(twinkleB, 1, 0.2) }]}>✦</Animated.Text>
          <Animated.Text style={[styles.star, { left: '56%', top: 22, fontSize: 8, opacity: twinkle(twinkleA, 1, 0.3) }]}>✦</Animated.Text>
          <Animated.Text style={[styles.star, { left: '80%', top: 70, fontSize: 9, opacity: twinkle(twinkleB, 0.3, 1) }]}>✦</Animated.Text>
        </>
      )}
      <Luminary period={period} width={width} />
      <TreeLine width={width} period={period} />
      <Animated.Text style={[styles.cloud, { top: 34, opacity: cloudOpacity }, drift(cloudA)]}>☁️</Animated.Text>
      <Animated.Text style={[styles.cloud, styles.cloudSmall, { top: 8, opacity: cloudOpacity }, drift(cloudB)]}>☁️</Animated.Text>
      <Animated.Text style={[styles.cloud, styles.cloudSmall, { top: 62, opacity: cloudOpacity * 0.8 }, drift(cloudC)]}>☁️</Animated.Text>
    </Animated.View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    sky: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
    // Dead centre of the band, between the greeting on the left and the vehicle pill / action button on the right, and well clear
    // of the top edge and of the rounded sheet that overlaps the bottom, so the sun is never cut off or hidden.
    bird: { position: 'absolute', left: 0 },
    sun: { position: 'absolute', left: '50%', marginLeft: -28, top: 14, width: 56, height: 56 },
    moon: { position: 'absolute', left: '50%', marginLeft: -20, top: 16, fontSize: 36 },
    star: { position: 'absolute', fontSize: 12, color: '#ffffff' },
    cloud: { position: 'absolute', left: 0, fontSize: 34 },
    cloudSmall: { fontSize: 24 },
    horizon: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, backgroundColor: '#7a3b2e' },
  })
);

export default WeatherAnimation;

/** Text colours that read on the sky of the given period (light sky by day and evening, dark at night), in either theme. */
export const skyInk = (period: Period) =>
  period === 'night' ? { main: '#e6f3fc', sub: '#a9cbe6' } : { main: '#0f2a3d', sub: '#2b4a63' };
