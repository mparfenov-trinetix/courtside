import Svg, { Circle, Path, Rect } from 'react-native-svg';

type TrophyProps = { size?: number; color: string };

// Every trophy is drawn on the same 24 x 30 canvas as the Larry O'Brien icon (`LarryOBrienIcon`), so a row of them lines up: a
// head (what makes it that award), a stem and a base. They are approximations of the real trophies, not copies: the shape that
// tells them apart at 18 pt is what they keep.
const CUT = 'rgba(0,0,0,0.38)';

/** A basketball: a disc with its seams cut out of it. */
function Ball({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const s = r * 0.16;
  return (
    <>
      <Circle cx={cx} cy={cy} r={r} fill={color} />
      <Path
        d={`M${cx - r} ${cy}h${2 * r}M${cx} ${cy - r}v${2 * r}M${cx - r * 0.7} ${cy - r * 0.62}c${r * 0.3} ${r * 0.6} ${r * 0.3} ${r * 0.64} 0 ${r * 1.24}M${cx + r * 0.7} ${cy - r * 0.62}c-${r * 0.3} ${r * 0.6} -${r * 0.3} ${r * 0.64} 0 ${r * 1.24}`}
        stroke={CUT}
        strokeWidth={Math.max(0.7, s)}
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

/** The stem and base every trophy stands on. */
function Stand({ color, stemTop = 17.5 }: { color: string; stemTop?: number }) {
  return (
    <>
      <Rect x={10} y={stemTop} width={4} height={23 - stemTop} rx={1} fill={color} />
      <Path d="M7 23h10l1.2 3H5.8z" fill={color} />
      <Rect x={5.6} y={25.6} width={12.8} height={3.6} rx={1} fill={color} />
      <Path d="M5.6 27.4h12.8" stroke={CUT} strokeWidth={0.8} />
    </>
  );
}

const star = (cx: number, cy: number, outer: number, inner: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';

/** The regular-season MVP: a ball on a tall column, with a collar under it. */
export function MvpTrophyIcon({ size = 22, color }: TrophyProps) {
  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 24 30">
      <Ball cx={12} cy={6.4} r={5.6} color={color} />
      <Path d="M7.2 12.2h9.6l-1.4 3.2H8.6z" fill={color} />
      <Path d="M8.6 14h6.8" stroke={CUT} strokeWidth={0.8} />
      <Stand color={color} stemTop={15} />
    </Svg>
  );
}

/** The Finals MVP: a ball held in an open hand. */
export function FinalsMvpTrophyIcon({ size = 22, color }: TrophyProps) {
  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 24 30">
      <Ball cx={12} cy={8.4} r={5.2} color={color} />
      {/* the cupped hand: a palm, a thumb on the left, fingers curling up the right */}
      <Path d="M4.4 12.6c0.6-1 1.8-0.6 2.4 0.4 1.4 2.2 3.2 3 5.2 3s3.8-0.8 5.2-3c0.6-1 1.8-1.4 2.4-0.4 0.4 0.8 0 1.6-0.6 2.6-1.8 3.2-4.4 5-7 5s-5.2-1.8-7-5c-0.6-1-1-1.8-0.6-2.6z" fill={color} />
      <Path d="M7 15.6c1.6 1.2 3.2 1.8 5 1.8s3.4-0.6 5-1.8" stroke={CUT} strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <Stand color={color} stemTop={19} />
    </Svg>
  );
}

/** A conference finals MVP (the Larry Bird and Magic Johnson trophies): a ball inside a ring, on a column. */
export function ConferenceMvpTrophyIcon({ size = 22, color }: TrophyProps) {
  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 24 30">
      <Circle cx={12} cy={7.6} r={6.6} stroke={color} strokeWidth={1.8} fill="none" />
      <Ball cx={12} cy={7.6} r={4} color={color} />
      <Path d="M8.2 14.2h7.6l-1 3H9.2z" fill={color} />
      <Stand color={color} stemTop={16.5} />
    </Svg>
  );
}

/** Defensive Player of the Year: a raised hand, open, on a base. */
export function DpoyTrophyIcon({ size = 22, color }: TrophyProps) {
  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 24 30">
      {/* four fingers, the middle one the longest, and the thumb */}
      <Rect x={5.6} y={5.6} width={3} height={9} rx={1.5} fill={color} />
      <Rect x={9} y={2.4} width={3} height={12} rx={1.5} fill={color} />
      <Rect x={12.4} y={3.6} width={3} height={11} rx={1.5} fill={color} />
      <Rect x={15.8} y={7} width={2.8} height={8} rx={1.4} fill={color} />
      <Path d="M5.6 13.4c-2.2-1.4-3.6-1.4-4 0.4-0.4 1.4 1.8 3.8 4.6 5.4z" fill={color} />
      <Rect x={5.6} y={12.6} width={13} height={7} rx={3.2} fill={color} />
      <Path d="M5.4 12.8h13.2" stroke={CUT} strokeWidth={0.8} />
      <Stand color={color} stemTop={19} />
    </Svg>
  );
}

/** Rookie of the Year: a star on a column. */
export function RoyTrophyIcon({ size = 22, color }: TrophyProps) {
  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 24 30">
      <Path d={star(12, 8.4, 8.2, 3.5)} fill={color} />
      <Path d="M7.4 14.6h9.2l-1.6 2.4H9z" fill={color} />
      <Stand color={color} stemTop={16.4} />
    </Svg>
  );
}
