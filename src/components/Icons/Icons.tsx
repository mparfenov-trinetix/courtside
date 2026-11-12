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

/** The triangle is drawn 1.5 units left of where its box would put it: its outline spans 8 to 20.6, its weight sits near the base, and halfway between the two lands on the box's centre, so it reads as centred in a round button with no padding. */
export function PlayIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 5.5v13a1 1 0 0 0 1.5.9l10.6-6.5a1 1 0 0 0 0-1.8L8 4.6A1 1 0 0 0 6.5 5.5z" fill={color} />
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

/** A medical cross: a player on the injury report. */
export function InjuryIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 4v16M4 12h16" {...stroke(color)} strokeWidth={3.4} />
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

export function ChevronLeftIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 5l-7 7 7 7" {...stroke(color)} />
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

/** The Larry O'Brien Championship Trophy: a ball held up by a flared, spiraling base. Filled, in one color. */
export function LarryOBrienIcon({ size = 22, color }: IconProps) {
  const cut = 'rgba(0,0,0,0.38)';
  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 24 30">
      {/* the ball and its seams */}
      <Circle cx={12} cy={6.2} r={5.6} fill={color} />
      <Path d="M6.4 6.2h11.2M12 0.6v11.2M8 2.4c1.6 2.4 1.6 5.2 0 7.6M16 2.4c-1.6 2.4-1.6 5.2 0 7.6" stroke={cut} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      {/* the sculpted cradle, widening from the stem to the ball */}
      <Path d="M5.4 10.6C7.4 14.4 10.2 14.8 10.4 20.2h3.2c0.2-5.4 3-5.8 5-9.6-2 1.8-4.4 2.6-6.6 2.6s-4.6-0.8-6.6-2.6z" fill={color} />
      <Path d="M8.6 14.6c2 0.6 4.8 0.6 6.8 0" stroke={cut} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      {/* the stem and base */}
      <Path d="M8.8 20.2h6.4l1.2 3.6H7.6z" fill={color} />
      <Rect x={5.6} y={24.2} width={12.8} height={4.4} rx={1} fill={color} />
      <Path d="M5.6 26h12.8" stroke={cut} strokeWidth={0.8} />
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

/** A draft board: numbered picks down the left, a name beside each. */
export function DraftIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5.5} cy={6} r={1.6} {...stroke(color)} />
      <Circle cx={5.5} cy={12} r={1.6} {...stroke(color)} />
      <Circle cx={5.5} cy={18} r={1.6} {...stroke(color)} />
      <Path d="M10.5 6H20M10.5 12H20M10.5 18H16" {...stroke(color)} />
    </Svg>
  );
}

/** A circle with an "i": more information (the box score legend). */
export function InfoIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...stroke(color)} />
      <Path d="M12 11v5.5" {...stroke(color)} />
      <Circle cx={12} cy={7.8} r={0.6} {...stroke(color)} />
    </Svg>
  );
}

/** A folded newspaper: headline bar, a picture block and lines of text. */
export function NewsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 4.5h11.5a1 1 0 0 1 1 1V19.5H6.5a1.5 1.5 0 0 1-1.5-1.5V4.5z" {...stroke(color)} />
      <Path d="M17.5 9.5H20v8.5a1.5 1.5 0 0 1-1.5 1.5h-1" {...stroke(color)} />
      <Path d="M8 8h6.5M8 11.5h3M8 15h3M13 11.5h1.5M13 15h1.5" {...stroke(color)} />
    </Svg>
  );
}

/** A medal on a ribbon: the season awards. */
export function MedalIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 3l4 6.5L16 3" {...stroke(color)} />
      <Circle cx={12} cy={15} r={5.5} {...stroke(color)} />
      <Path d="M12 12.4l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3.9-1.8z" {...stroke(color)} strokeWidth={1.2} />
    </Svg>
  );
}

/** A pulse line: the league's wire (injuries and moves). */
export function WireIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 12h4l2.5-6 4 12 2.5-6H21" {...stroke(color)} />
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

export function FlameIcon({ size = 22, color, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-1.8.8-3 1.8-4 .3 1.4 1 2 1.7 2.3C10.2 8.6 10.6 5.6 12 3z"
        {...stroke(color)}
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

/** Calendar views: stacked cards (agenda), a day's time lines, and a month grid. */
export function ViewAgendaIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={16} height={7} rx={2} {...stroke(color)} />
      <Rect x={4} y={13} width={16} height={7} rx={2} {...stroke(color)} />
    </Svg>
  );
}

export function ViewDayIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 5h14M5 9.5h14M5 14h14M5 18.5h14" {...stroke(color)} />
    </Svg>
  );
}

export function ViewMonthIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={16} height={16} rx={3} {...stroke(color)} />
      <Path d="M4 9.5h16M4 14.8h16M9.4 4v16M14.7 4v16" {...stroke(color)} />
    </Svg>
  );
}
