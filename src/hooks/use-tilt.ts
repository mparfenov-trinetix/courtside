import { usePanGesture } from 'react-native-gesture-handler';
import {
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/**
 * Flip these if the card leans the wrong way on your device.
 * Gravity axes can differ slightly between platforms and sensor vendors.
 */
const INVERT_X = 1;
const INVERT_Y = -1;

/** How far the phone has to lean (as a fraction of g) for full tilt. */
const RANGE = 0.3;
/** How quickly "neutral" follows the way you're holding the phone. Lower = slower. */
const RECENTER = 0.01;
/** Low-pass smoothing on the sensor signal. Lower = smoother but laggier. */
const SMOOTH = 0.2;

const clamp = (v: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, v));
};

/**
 * Returns tilt as two shared values in [-1, 1] (x: left/right, y: toward/away),
 * driven by the gravity sensor entirely on the UI thread. Touching and dragging
 * the card overrides the sensor, which also makes the effect usable in a
 * simulator where there's no real sensor.
 */
export function useTilt(size: { width: number; height: number }) {
  const reducedMotion = useReducedMotion();
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });

  const baseX = useSharedValue<number | null>(null);
  const baseY = useSharedValue(0);
  const sensorX = useSharedValue(0);
  const sensorY = useSharedValue(0);

  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const touchWeight = useSharedValue(0); // 0 = sensor, 1 = finger

  useAnimatedReaction(
    () => gravity.sensor.value,
    (g) => {
      const magnitude = Math.hypot(g.x, g.y, g.z);
      if (!magnitude) return;
      const nx = g.x / magnitude;
      const ny = g.y / magnitude;

      if (baseX.value === null) {
        baseX.value = nx;
        baseY.value = ny;
      }
      // Neutral slowly drifts toward the current pose, so the card settles
      // flat however you're holding the phone, and only reacts to movement.
      baseX.value += (nx - baseX.value) * RECENTER;
      baseY.value += (ny - baseY.value) * RECENTER;

      const targetX = clamp(((nx - baseX.value) / RANGE) * INVERT_X, -1, 1);
      const targetY = clamp(((ny - baseY.value) / RANGE) * INVERT_Y, -1, 1);
      sensorX.value += (targetX - sensorX.value) * SMOOTH;
      sensorY.value += (targetY - sensorY.value) * SMOOTH;
    },
  );

  const toTilt = (x: number, y: number) => {
    'worklet';
    touchX.value = clamp((x / size.width) * 2 - 1, -1, 1);
    touchY.value = clamp((y / size.height) * 2 - 1, -1, 1);
  };

  const gesture = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      'worklet';
      toTilt(e.x, e.y);
      touchWeight.value = withSpring(1, { damping: 18, stiffness: 180 });
    },
    onUpdate: (e) => {
      'worklet';
      toTilt(e.x, e.y);
    },
    onFinalize: () => {
      'worklet';
      touchWeight.value = withSpring(0, { damping: 14, stiffness: 120 });
    },
  });

  const x = useDerivedValue(() => {
    const sensor = reducedMotion ? 0 : sensorX.value;
    return sensor * (1 - touchWeight.value) + touchX.value * touchWeight.value;
  });
  const y = useDerivedValue(() => {
    const sensor = reducedMotion ? 0 : sensorY.value;
    return sensor * (1 - touchWeight.value) + touchY.value * touchWeight.value;
  });

  return { x, y, gesture, sensorAvailable: gravity.isAvailable };
}

export type Tilt = ReturnType<typeof useTilt>;
