import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

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

export function TrophyIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 21h8M12 17v4M17 3h3v4a3 3 0 0 1-3 3M7 3H4v4a3 3 0 0 0 3 3" {...stroke(color)} />
      <Path d="M7 3h10v6a5 5 0 0 1-10 0V3z" {...stroke(color)} />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19 12H5M12 5l-7 7 7 7" {...stroke(color)} />
    </Svg>
  );
}

export function CalendarIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={16} rx={2} {...stroke(color)} />
      <Line x1={3} y1={10} x2={21} y2={10} {...stroke(color)} />
      <Line x1={8} y1={3} x2={8} y2={7} {...stroke(color)} />
      <Line x1={16} y1={3} x2={16} y2={7} {...stroke(color)} />
      <Path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2" {...stroke(color)} />
    </Svg>
  );
}

export function StandingsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={10} width={4} height={10} rx={1} {...stroke(color)} />
      <Rect x={10} y={6} width={4} height={14} rx={1} {...stroke(color)} />
      <Rect x={16} y={13} width={4} height={7} rx={1} {...stroke(color)} />
    </Svg>
  );
}

export function CompareIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={8} cy={8} r={3.5} {...stroke(color)} />
      <Circle cx={16} cy={8} r={3.5} {...stroke(color)} />
      <Path d="M3 20c0-3 2.2-5 5-5M21 20c0-3-2.2-5-5-5M9 20h6" {...stroke(color)} />
    </Svg>
  );
}

export function PodiumIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={5} r={2} {...stroke(color)} />
      <Rect x={9} y={9} width={6} height={11} rx={1} {...stroke(color)} />
      <Path d="M9 13H4.5a.5.5 0 0 0-.5.5V20h5M15 15h4.5a.5.5 0 0 1 .5.5V20h-5" {...stroke(color)} />
    </Svg>
  );
}

export function BracketIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 5h5v5H4zM4 14h5v5H4zM15 9.5h5v5h-5z" {...stroke(color)} />
      <Path d="M9 7.5h2.5v9H9M11.5 12H15" {...stroke(color)} />
    </Svg>
  );
}

export function SearchIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={6.5} {...stroke(color)} />
      <Path d="M16 16l4.5 4.5" {...stroke(color)} />
    </Svg>
  );
}

export function CupIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4h10v5a5 5 0 0 1-10 0V4z" {...stroke(color)} />
      <Path d="M7 6H4.5a1.5 1.5 0 0 0 0 3H7M17 6h2.5a1.5 1.5 0 0 1 0 3H17" {...stroke(color)} />
      <Path d="M12 14v3M8.5 20h7M10 17h4" {...stroke(color)} />
    </Svg>
  );
}
