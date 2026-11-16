import React, { useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';

interface SliderProps {
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ min, max, value, onChange }) => {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromEvent = (e: GestureResponderEvent) => {
    const w = widthRef.current;
    if (!w) return;
    const ratio = Math.min(1, Math.max(0, e.nativeEvent.locationX / w));
    onChangeRef.current(Math.round(min + ratio * (max - min)));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: setFromEvent,
      onPanResponderMove: setFromEvent,
    })
  ).current;

  const ratio = value === null ? 0 : (value - min) / (max - min);

  return (
    <View
      style={styles.hitArea}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      {...responder.panHandlers}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: `${ratio * 100}%` }, value === null && styles.fillIdle]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, value === null && styles.thumbIdle, { left: ratio * width - THUMB / 2 }]}
      />
    </View>
  );
};

const THUMB = 24;

const styles = themedStyles(() => StyleSheet.create({
  hitArea: { height: 40, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary },
  fillIdle: { backgroundColor: 'transparent' },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: Colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 4,
  },
  thumbIdle: { backgroundColor: Colors.bgCardHover, borderColor: Colors.subtleBorder, shadowOpacity: 0 },
}));
