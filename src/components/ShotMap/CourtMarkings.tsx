import { Circle, Line, Path, Rect } from 'react-native-svg';

import { palette, withAlpha } from '@/lib/theme';
import { COURT_W, CORNER_X, CORNER_Y, HOOP, THREE_R } from './constants';

/** The half court's lines, drawn inside an `<Svg>` of `width` x `height` (height = COURT_H * width / COURT_W). */
export function CourtMarkings({ width, height }: { width: number; height: number }) {
  const scale = width / COURT_W;
  const X = (x: number) => x * scale;
  const Y = (y: number) => height - y * scale;
  const line = withAlpha(palette.chalk, 0.32);
  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill={withAlpha(palette.maple, 0.07)} />
      <Rect x={1} y={1} width={width - 2} height={height - 2} fill="none" stroke={line} strokeWidth={1.5} />
      <Rect x={X(17)} y={Y(19)} width={16 * scale} height={19 * scale} fill="none" stroke={line} strokeWidth={1.5} />
      <Path d={`M${X(19)},${Y(19)} A${6 * scale},${6 * scale} 0 0 1 ${X(31)},${Y(19)}`} fill="none" stroke={line} strokeWidth={1.5} />
      <Path d={`M${X(19)},${Y(19)} A${6 * scale},${6 * scale} 0 0 0 ${X(31)},${Y(19)}`} fill="none" stroke={line} strokeWidth={1.5} strokeDasharray="4,5" />
      <Path d={`M${X(21)},${Y(HOOP.y)} A${4 * scale},${4 * scale} 0 0 1 ${X(29)},${Y(HOOP.y)}`} fill="none" stroke={line} strokeWidth={1.5} />
      <Path
        d={`M${X(CORNER_X)},${Y(0)} L${X(CORNER_X)},${Y(CORNER_Y)} A${THREE_R * scale},${THREE_R * scale} 0 0 1 ${X(COURT_W - CORNER_X)},${Y(CORNER_Y)} L${X(COURT_W - CORNER_X)},${Y(0)}`}
        fill="none"
        stroke={line}
        strokeWidth={1.5}
      />
      <Line x1={X(22)} y1={Y(4)} x2={X(28)} y2={Y(4)} stroke={line} strokeWidth={2.5} />
      <Circle cx={X(HOOP.x)} cy={Y(HOOP.y)} r={0.75 * scale} fill="none" stroke={withAlpha(palette.maple, 0.9)} strokeWidth={1.5} />
    </>
  );
}
