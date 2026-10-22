import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop, Circle } from 'react-native-svg';

type Shape = { body: string; windows: string[]; wheels: [number, number, number][]; base: string; top: string };

// Side views drawn on a 64×48 board. Each body is shaded top-light to bottom-dark with a glossy highlight, so the vehicle reads as a 3D object.
const SHAPES: Record<string, Shape> = {
  Sedan: {
    base: '#1d4ed8', top: '#6aa6ff',
    body: 'M4 33 L4 28.5 Q4 25.5 8 25 L17 23.5 L23 15.5 Q24 14.5 26 14.5 L40 14.5 Q42 14.5 43.5 16 L48 23.5 L56 25 Q60 26 60 29.5 L60 33 Q60 35.5 57.5 35.5 L6.5 35.5 Q4 35.5 4 33Z',
    windows: ['M20.5 23 L25 17 L33 17 L33 23Z', 'M35 17 L40.5 17 L45 23 L35 23Z'],
    wheels: [[16, 35.5, 6.5], [48, 35.5, 6.5]],
  },
  Hatchback: {
    base: '#dc2626', top: '#ff8b8b',
    body: 'M5 33 L5 21 Q5 16.5 9.5 16 L40 16 Q44 16 46 19.5 L49 24 L56 25.5 Q60 26.5 60 29.5 L60 33 Q60 35.5 57.5 35.5 L7.5 35.5 Q5 35.5 5 33Z',
    windows: ['M9 18.5 H25 V23.5 H8Z', 'M27 18.5 H40 L44.5 23.5 H27Z'],
    wheels: [[16, 35.5, 6.5], [48, 35.5, 6.5]],
  },
  SUV: {
    base: '#15803d', top: '#6ee7a0',
    body: 'M4 34 L4 22.5 Q4 19.5 7 19 L10 14.5 Q11 13.5 13 13.5 L44 13.5 Q46 13.5 47 15 L51 21.5 L57 23 Q60 24 60 27.5 L60 34 Q60 36.5 57.5 36.5 L6.5 36.5 Q4 36.5 4 34Z',
    windows: ['M12 16.5 H25 V22 H9Z', 'M27 16.5 H44 L48 22 H27Z'],
    wheels: [[16, 36.5, 7], [48, 36.5, 7]],
  },
  Van: {
    base: '#ea580c', top: '#ffb27a',
    body: 'M3 34 L3 14.5 Q3 11.5 6 11.5 L40 11.5 Q43 11.5 45 14.5 L50 22.5 L57 24.5 Q61 25.5 61 28.5 L61 34 Q61 36.5 58.5 36.5 L5.5 36.5 Q3 36.5 3 34Z',
    windows: ['M7 15 H14 V21.5 H7Z', 'M17 15 H27 V21.5 H17Z', 'M29 15 H40 L44.5 21.5 H29Z'],
    wheels: [[16, 36.5, 6.8], [48, 36.5, 6.8]],
  },
  Pickup: {
    base: '#7c3aed', top: '#c4a1ff',
    body: 'M3 33.5 L3 27.5 Q3 25.5 5 25.5 L28 25.5 L33 16.5 Q34 15 36 15 L46 15 Q48 15 49 16.5 L52 23.5 L58 25 Q61 26 61 29.5 L61 33.5 Q61 36 58.5 36 L5.5 36 Q3 36 3 33.5Z',
    windows: ['M33.5 23.5 L37 17.5 H45 L48 23.5Z'],
    wheels: [[15, 36, 6.8], [49, 36, 6.8]],
  },
  'Three-wheeler': {
    base: '#ca8a04', top: '#ffe074',
    body: 'M8 34 L8 18.5 Q8 13.5 13 13.5 L34 13.5 Q38 13.5 39.5 17.5 L42 24.5 L51 26.5 Q56 28 56 31.5 L56 34 Q56 36.5 53.5 36.5 L10.5 36.5 Q8 36.5 8 34Z',
    windows: ['M12 17 H30 V23 H12Z', 'M32 17 H36 L39 23 H32Z'],
    wheels: [[18, 36.5, 6.5], [30, 36.5, 6.5], [48, 36.5, 6.5]],
  },
};

const Wheel: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <>
    <Circle cx={cx} cy={cy} r={r} fill="url(#vi-tyre)" />
    <Circle cx={cx} cy={cy} r={r * 0.55} fill="url(#vi-rim)" />
    <Circle cx={cx} cy={cy} r={r * 0.18} fill="#4b5563" />
  </>
);

/** A vehicle of the given type (`VEHICLE_TYPES` id) drawn with depth: glossy shaded body, glass, shining rims and a ground shadow. */
export const VehicleIcon3D: React.FC<{ type: string; size?: number }> = ({ type, size = 32 }) => {
  const h = size * 0.75;
  const defs = (id: string, base: string, top: string) => (
    <Defs>
      <LinearGradient id={`vi-b-${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={top} />
        <Stop offset="0.45" stopColor={base} />
        <Stop offset="1" stopColor={base} stopOpacity={0.78} />
      </LinearGradient>
      <LinearGradient id="vi-glass" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#e6f4ff" />
        <Stop offset="1" stopColor="#5b7c9c" />
      </LinearGradient>
      <LinearGradient id="vi-gloss" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
        <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
      </LinearGradient>
      <RadialGradient id="vi-tyre" cx="0.5" cy="0.4" r="0.7">
        <Stop offset="0" stopColor="#4b5563" />
        <Stop offset="1" stopColor="#111827" />
      </RadialGradient>
      <RadialGradient id="vi-rim" cx="0.4" cy="0.35" r="0.8">
        <Stop offset="0" stopColor="#ffffff" />
        <Stop offset="1" stopColor="#9ca3af" />
      </RadialGradient>
      <ClipPath id={`vi-c-${id}`}>
        <Path d={SHAPES[id]?.body ?? ''} />
      </ClipPath>
    </Defs>
  );

  if (type === 'Motorbike') {
    return (
      <Svg width={size} height={h} viewBox="0 0 64 48">
        <Defs>
          <LinearGradient id="vi-b-Motorbike" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ff9a9a" />
            <Stop offset="0.5" stopColor="#dc2626" />
            <Stop offset="1" stopColor="#991b1b" />
          </LinearGradient>
          <RadialGradient id="vi-tyre" cx="0.5" cy="0.4" r="0.7">
            <Stop offset="0" stopColor="#4b5563" />
            <Stop offset="1" stopColor="#111827" />
          </RadialGradient>
          <RadialGradient id="vi-rim" cx="0.4" cy="0.35" r="0.8">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="1" stopColor="#9ca3af" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={32} cy={42.5} rx={27} ry={2.6} fill="#000" opacity={0.2} />
        <Path d="M14 35 L26 35 L33 23 L43 23 L50 35" stroke="#374151" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M45 21 L49 14 L54 14" stroke="#374151" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M50 35 L45.5 19" stroke="#9ca3af" strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M26.5 22 Q31 15.5 39 18 L43 22.5 L30 25Z" fill="url(#vi-b-Motorbike)" />
        <Path d="M27.5 21.5 Q31.5 17.5 37.5 18.8" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        <Path d="M16 22.5 Q22 20.5 29 22.5 L28 25 Q21 24 16 25Z" fill="#1f2937" />
        <Wheel cx={14} cy={35} r={8} />
        <Wheel cx={50} cy={35} r={8} />
      </Svg>
    );
  }

  const s = SHAPES[type] ?? SHAPES.Sedan;
  const id = SHAPES[type] ? type : 'Sedan';
  return (
    <Svg width={size} height={h} viewBox="0 0 64 48">
      {defs(id, s.base, s.top)}
      <Ellipse cx={32} cy={42.5} rx={27} ry={2.6} fill="#000" opacity={0.2} />
      <Path d={s.body} fill={`url(#vi-b-${id})`} />
      <Path d={s.body} fill="url(#vi-gloss)" clipPath={`url(#vi-c-${id})`} opacity={0.5} />
      {s.windows.map((d) => (
        <Path key={d} d={d} fill="url(#vi-glass)" />
      ))}
      <Path d="M5 31 H59" stroke="#000" strokeOpacity={0.12} strokeWidth={1} />
      <Circle cx={58} cy={29.5} r={1.5} fill="#fff7c2" />
      {s.wheels.map(([cx, cy, r], i) => (
        <Wheel key={i} cx={cx} cy={cy} r={r} />
      ))}
    </Svg>
  );
};

/** The vehicle's 3D icon followed by text on one line (the vehicle's name, plate...), taking the same style as a Text. */
export const VehicleLabel: React.FC<{ type: string; style?: StyleProp<TextStyle>; numberOfLines?: number; /** Something after the text on the same line (a tag by a name). */ tail?: React.ReactNode; children?: React.ReactNode }> = ({ type, style, numberOfLines, tail, children }) => {
  const fontSize = (StyleSheet.flatten(style) as TextStyle | undefined)?.fontSize ?? 12;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
      <VehicleIcon3D type={type} size={Math.round(fontSize * 1.9)} />
      <Text style={[style, { flexShrink: 1 }]} numberOfLines={numberOfLines}>
        {children}
      </Text>
      {tail}
    </View>
  );
};
