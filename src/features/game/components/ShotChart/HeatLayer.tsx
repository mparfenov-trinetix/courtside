import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Rect } from 'react-native-svg';

import { CELL, COLD, COURT_H, COURT_W, HOOP, HOT } from './constants';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type HeatCellData = { cx: number; cy: number; made: number; att: number };

/** Farthest a cell can be from the rim; sets how long the ripple takes to reach it. */
const REACH = Math.hypot(COURT_W / 2, COURT_H);

/**
 * The heat map: every cell fades in as a ripple spreading out from the rim. One shared value drives all of them on
 * the UI thread. Mount it with a fresh `key` whenever the shots change and it plays again.
 */
export function HeatLayer({
  cells,
  base,
  scale,
  height,
}: {
  cells: HeatCellData[];
  base: number;
  scale: number;
  height: number;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.set(withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [reveal]);

  return (
    <>
      {cells.map((c) => {
        const K = 2;
        const diff = (c.made + K * base) / (c.att + K) - base;
        const strength = Math.min(1, Math.abs(diff) / 0.22);
        // Volume matters too: a lone attempt stays faint however it went.
        const volume = Math.min(1, 0.35 + c.att / 4);
        const target = Math.max(0.12, strength * 0.85 * volume);
        const delay = (Math.hypot((c.cx + 0.5) * CELL - HOOP.x, (c.cy + 0.5) * CELL - HOOP.y) / REACH) * 0.5;
        return (
          <HeatCell
            key={`${c.cx}:${c.cy}`}
            reveal={reveal}
            delay={delay}
            target={target}
            x={c.cx * CELL * scale + 0.5}
            y={height - (c.cy + 1) * CELL * scale + 0.5}
            size={CELL * scale - 1}
            fill={diff >= 0 ? HOT : COLD}
          />
        );
      })}
    </>
  );
}

function HeatCell({
  reveal,
  delay,
  target,
  x,
  y,
  size,
  fill,
}: {
  reveal: SharedValue<number>;
  delay: number;
  target: number;
  x: number;
  y: number;
  size: number;
  fill: string;
}) {
  const props = useAnimatedProps(() => ({
    opacity: target * Math.min(1, Math.max(0, (reveal.get() - delay) / 0.45)),
  }));
  return <AnimatedRect animatedProps={props} x={x} y={y} width={size} height={size} rx={4} fill={fill} opacity={0} />;
}
