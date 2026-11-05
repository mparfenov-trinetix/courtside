import Svg, { Circle, ClipPath, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

/**
 * Same artwork as the native splash icon (`assets/images/splash-icon.png`, rendered from this geometry), drawn in SVG so it can
 * animate: a shaded sphere lit from the top left, a rim that darkens, a soft highlight and the seams. Keep the two in step: the
 * intro hands over from the splash image to this one without a visible change.
 */
export function Basketball({ size }: { size: number }) {
  const seam = { stroke: '#1A120A', strokeWidth: 3.4, fill: 'none' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="ball-clip">
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
        <RadialGradient id="ball-shade" gradientUnits="userSpaceOnUse" cx={34} cy={30} r={77.5}>
          <Stop offset={0} stopColor="#FFB872" />
          <Stop offset={0.35} stopColor="#F08A3C" />
          <Stop offset={0.72} stopColor="#DB6F26" />
          <Stop offset={1} stopColor="#A94D17" />
        </RadialGradient>
        <RadialGradient id="ball-rim" gradientUnits="userSpaceOnUse" cx={50} cy={50} r={50}>
          <Stop offset={0.82} stopColor="#7E3A12" stopOpacity={0} />
          <Stop offset={1} stopColor="#7E3A12" stopOpacity={0.45} />
        </RadialGradient>
        <RadialGradient id="ball-spot" gradientUnits="userSpaceOnUse" cx={32} cy={27} r={16}>
          <Stop offset={0} stopColor="#FFECD2" stopOpacity={0.4} />
          <Stop offset={1} stopColor="#FFECD2" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill="url(#ball-shade)" />
      <Circle cx={50} cy={50} r={50} fill="url(#ball-rim)" />
      <Circle cx={32} cy={27} r={16} fill="url(#ball-spot)" />
      <G clipPath="url(#ball-clip)">
        <Path d="M50 0v100M0 50h100" {...seam} />
        <Path d="M17.5 8.5C34 26 34 74 17.5 91.5" {...seam} />
        <Path d="M82.5 8.5C66 26 66 74 82.5 91.5" {...seam} />
      </G>
    </Svg>
  );
}
