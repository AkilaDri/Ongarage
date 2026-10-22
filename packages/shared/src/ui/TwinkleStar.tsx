import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * A small sparkle that twinkles: it swells and fades in and out while turning a little, over and over. For a "new" mark (a first-time customer
 * or garage). The beat is read from the clock on every frame, so it never stalls and every sparkle twinkles together.
 */
export const TwinkleStar: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#f5b301' }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      t.setValue((Date.now() % 1800) / 1800);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [t]);
  return (
    <Animated.View
      style={{
        opacity: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 1, 0.45] }),
        transform: [
          { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.75, 1.25, 0.75] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill={color} />
      </Svg>
    </Animated.View>
  );
};
