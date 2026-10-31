import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color: string; filled?: boolean };

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function MenuIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h16M4 12h11M4 17h16" {...stroke(color)} />
    </Svg>
  );
}

export function CardIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={3} width={14} height={18} rx={3} {...stroke(color)} />
      <Circle cx={12} cy={10} r={3} {...stroke(color)} />
      <Path d="M8.5 17h7" {...stroke(color)} />
    </Svg>
  );
}

export function GridIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={6.5} height={6.5} rx={1.5} {...stroke(color)} />
      <Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.5} {...stroke(color)} />
      <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.5} {...stroke(color)} />
      <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.5} {...stroke(color)} />
    </Svg>
  );
}

export function PeopleIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={9} cy={8} r={3.5} {...stroke(color)} />
      <Path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" {...stroke(color)} />
      <Path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.7.8 2.9 2.5 3.5 5.2" {...stroke(color)} />
    </Svg>
  );
}

export function StarIcon({ size = 22, color, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
        {...stroke(color)}
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function ChevronIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5l7 7-7 7" {...stroke(color)} />
    </Svg>
  );
}

export function BasketballIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...stroke(color)} />
      <Path d="M3 12h18M12 3v18M6 5.2c2.2 4 2.2 9.6 0 13.6M18 5.2c-2.2 4-2.2 9.6 0 13.6" {...stroke(color)} />
    </Svg>
  );
}
