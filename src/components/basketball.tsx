import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';

/** Same artwork as the native splash icon, drawn in SVG so it can animate. */
export function Basketball({ size }: { size: number }) {
  const r = 50;
  const seam = { stroke: '#1A120A', strokeWidth: 4.4, fill: 'none' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="ball-clip">
          <Circle cx={50} cy={50} r={r} />
        </ClipPath>
      </Defs>
      <Circle cx={50} cy={50} r={r} fill="#E2782C" />
      <G clipPath="url(#ball-clip)">
        <Ellipse cx={58} cy={30} rx={38} ry={29} fill="#FFAA5A" opacity={0.24} />
        <Path d="M50 0v100M0 50h100" {...seam} />
        <Path d="M17.5 8.5C34 26 34 74 17.5 91.5" {...seam} />
        <Path d="M82.5 8.5C66 26 66 74 82.5 91.5" {...seam} />
      </G>
    </Svg>
  );
}
