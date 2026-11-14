import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { G, Line, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTeams, useAppWindow } from '@/hooks';
import type { Game } from '@/lib/espn';
import { tricode } from '@/lib/espn';
import { ARENAS, arenaOf, milesBetween } from '@/lib/league';
import { fonts, motion, palette, radius, surfaces, textStyle, withAlpha } from '@/lib/theme';
import { openDetail, teamHref } from '@/navigation';
import { ASPECT, FINE_BELOW, FINE_FROM, GRID, landPath, MAX_ZOOM, project } from './constants';

const SIDE = 16;
const PAD = 12;
const HIT = 28;

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);

type View2D = { z: SharedValue<number>; tx: SharedValue<number>; ty: SharedValue<number> };

/** Keeps the map's edges on the viewport's: at zoom `z` the world is `size * z` long, so its offset runs from 0 down to `size * (1 - z)`. */
const clampOffset = (t: number, size: number, z: number) => {
  'worklet';
  return Math.min(0, Math.max(size * (1 - z), t));
};

/**
 * The 30 arenas on a dot-grid map of the lower 48 (and Toronto) that you can pinch to zoom, drag, and double-tap to zoom in or back out.
 * This team's arena is lit in its color; when its next game is away the host's is ringed and joined to it by a dashed line with the
 * distance. A tap on a dot selects that arena (the line under the map names it and opens the team); zoomed in, every dot says whose it is.
 * The land is redrawn on a grid twice as fine past 2x, so the dots keep their size instead of growing; the markers are views placed from
 * the same transform, so they stay the same size at every zoom and stay sharp.
 */
export function ArenaMap({ teamId, schedule, accent }: { teamId: string; schedule?: Game[]; accent: string }) {
  const { width } = useAppWindow();
  const { data: teams } = useTeams();
  const mapWidth = Math.round(width - 2 * SIDE - 2 * PAD);
  const mapHeight = Math.round(mapWidth / ASPECT);

  const z = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const view: View2D = { z, tx, ty };
  // What the JS side needs to know of the zoom, kept to what changes the picture: dragging is only on once zoomed (at rest the map must not
  // swallow the page's scroll), the fine grid takes over past 2x, and the Reset pill shows while zoomed.
  const [zoomed, setZoomed] = useState(false);
  const [fine, setFine] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const lastKey = useSharedValue(0);

  const coarseLand = useMemo(() => landPath(mapWidth, GRID), [mapWidth]);
  const fineLand = useMemo(() => (fine ? landPath(mapWidth, GRID / 2) : ''), [mapWidth, fine]);

  const applyZoom = (zoom: number) => {
    setZoomed(zoom > 1.02);
    setFine((f) => (zoom >= FINE_FROM ? true : zoom < FINE_BELOW ? false : f));
  };
  /** Tells the JS side only when a threshold is crossed, not on every frame of a pinch. */
  const notify = (zoom: number) => {
    'worklet';
    const key = (zoom > 1.02 ? 1 : 0) + (zoom >= FINE_FROM ? 2 : zoom < FINE_BELOW ? 0 : lastKey.get() & 2);
    if (key !== lastKey.get()) {
      lastKey.set(key);
      scheduleOnRN(applyZoom, zoom);
    }
  };

  const zoomAround = (x: number, y: number, to: number, animate: boolean) => {
    'worklet';
    const from = z.get();
    const wx = (x - tx.get()) / from;
    const wy = (y - ty.get()) / from;
    const nx = clampOffset(x - wx * to, mapWidth, to);
    const ny = clampOffset(y - wy * to, mapHeight, to);
    if (animate) {
      z.set(withTiming(to, { duration: motion.base }));
      tx.set(withTiming(nx, { duration: motion.base }));
      ty.set(withTiming(ny, { duration: motion.base }));
    } else {
      z.set(to);
      tx.set(nx);
      ty.set(ny);
    }
    notify(to);
  };

  const pan = usePanGesture({
    enabled: zoomed,
    onUpdate: (e) => {
      'worklet';
      tx.set(clampOffset(tx.get() + e.changeX, mapWidth, z.get()));
      ty.set(clampOffset(ty.get() + e.changeY, mapHeight, z.get()));
    },
  });
  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      const to = Math.min(MAX_ZOOM, Math.max(1, z.get() * e.scaleChange));
      zoomAround(e.focalX, e.focalY, to, false);
    },
  });
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      'worklet';
      zoomAround(e.x, e.y, z.get() > 1.2 ? 1 : 2.5, true);
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch, doubleTap);

  const reset = () => {
    z.set(withTiming(1, { duration: motion.base }));
    tx.set(withTiming(0, { duration: motion.base }));
    ty.set(withTiming(0, { duration: motion.base }));
    lastKey.set(0);
    applyZoom(1);
  };

  // `matrix` is the native prop the SVG library turns `transform` into; animated props reach it directly, which `transform` does not.
  const landProps = useAnimatedProps(() => ({ matrix: [z.get(), 0, 0, z.get(), tx.get(), ty.get()] }) as object);

  const own = arenaOf(teamId);
  const next = useMemo(
    () => (schedule ?? []).filter((g) => !g.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0],
    [schedule],
  );
  const abbrOf = (id: string) => {
    const a = teams?.find((t) => t.id === id)?.abbreviation;
    return a ? tricode(a) : '';
  };
  if (!own) return null;

  const away = next && !next.home ? arenaOf(next.opponentId) : undefined;
  const awayId = next && !next.home ? next.opponentId : undefined;
  const from = project(own.lon, own.lat, mapWidth);
  const to = away ? project(away.lon, away.lat, mapWidth) : null;

  const shownId = selected ?? teamId;
  const shown = ARENAS[shownId] ?? own;
  const trip = shownId === teamId ? undefined : milesBetween(own, shown);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Arenas</Text>
      <View style={styles.card}>
        <GestureDetector gesture={gesture}>
          <View style={[styles.viewport, { width: mapWidth, height: mapHeight }]}>
            <Svg width={mapWidth} height={mapHeight} style={StyleSheet.absoluteFill}>
              <AnimatedG animatedProps={landProps}>
                <Path d={fine ? fineLand : coarseLand} stroke={withAlpha(palette.chalk, 0.13)} strokeWidth={fine ? GRID * 0.17 : GRID * 0.34} strokeLinecap="round" />
              </AnimatedG>
            </Svg>
            {to ? <TripLine view={view} from={from} to={to} width={mapWidth} height={mapHeight} color={accent} /> : null}
            {Object.entries(ARENAS).map(([id, a]) => {
              if (id === teamId || id === awayId) return null;
              return (
                <Marker
                  key={id}
                  view={view}
                  at={project(a.lon, a.lat, mapWidth)}
                  label={abbrOf(id)}
                  kind="other"
                  selected={selected === id}
                  onPress={() => setSelected((s) => (s === id ? null : id))}
                />
              );
            })}
            {awayId && away && to ? (
              <Marker view={view} at={to} label={next?.opponentAbbr ?? abbrOf(awayId)} kind="host" selected={selected === awayId} onPress={() => setSelected((s) => (s === awayId ? null : awayId))} />
            ) : null}
            <Marker view={view} at={from} label={abbrOf(teamId)} kind="own" color={accent} selected={false} onPress={() => setSelected(null)} />
            {zoomed ? (
              <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="Reset the map" hitSlop={8} style={styles.reset}>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            ) : null}
          </View>
        </GestureDetector>
        <View style={styles.foot}>
          <View style={{ flex: 1 }}>
            <Text style={styles.arena} numberOfLines={1}>
              {shown.name}
            </Text>
            <Text style={styles.city} numberOfLines={1}>
              {shown.city}
              {shownId !== teamId && abbrOf(shownId) ? ` · ${abbrOf(shownId)}` : ''}
            </Text>
          </View>
          {selected ? (
            <Pressable onPress={() => openDetail(teamHref(selected))} accessibilityRole="button" hitSlop={8} style={styles.trip}>
              <Text style={styles.tripLabel}>{trip != null ? `${trip.toLocaleString('en-US')} mi from ${abbrOf(teamId)}` : ''}</Text>
              <Text style={[styles.tripValue, { color: accent }]}>Team page ›</Text>
            </Pressable>
          ) : next ? (
            <View style={styles.trip}>
              <Text style={styles.tripLabel}>Next game</Text>
              <Text style={styles.tripValue}>{away ? `${milesBetween(own, away).toLocaleString('en-US')} mi away` : next.home ? 'At home' : '–'}</Text>
            </View>
          ) : (
            <Text style={styles.hint}>Pinch to zoom</Text>
          )}
        </View>
      </View>
    </View>
  );
}

/** A dot placed from the map's transform: its position follows the pan and zoom, its size does not. */
function Marker({
  view,
  at,
  label,
  kind,
  color,
  selected,
  onPress,
}: {
  view: View2D;
  at: { x: number; y: number };
  label: string;
  kind: 'own' | 'host' | 'other';
  color?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { z, tx, ty } = view;
  const place = useAnimatedStyle(() => ({
    transform: [{ translateX: at.x * z.get() + tx.get() - HIT / 2 }, { translateY: at.y * z.get() + ty.get() - HIT / 2 }],
  }));
  // The two that matter always carry their code; the rest say whose they are once the map is zoomed in enough to have room.
  const labelStyle = useAnimatedStyle(() => ({ opacity: kind === 'other' ? interpolate(z.get(), [1.7, 2.4], [0, 1], 'clamp') : 1 }));
  const dot = kind === 'own' ? 11 : kind === 'host' ? 9 : 6;
  const fill = kind === 'own' ? (color ?? palette.chalk) : kind === 'host' ? palette.chalk : withAlpha(palette.chalk, 0.5);
  return (
    <Animated.View style={[styles.marker, place]} pointerEvents="box-none">
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.hit}>
        {kind === 'own' ? <View style={[styles.halo, { backgroundColor: withAlpha(fill, 0.22) }]} /> : null}
        {kind === 'host' || selected ? <View style={[styles.ring, { borderColor: withAlpha(palette.chalk, selected ? 0.9 : 0.5), width: dot + 10, height: dot + 10, borderRadius: (dot + 10) / 2 }]} /> : null}
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: fill }} />
      </Pressable>
      {label ? (
        <Animated.Text
          pointerEvents="none"
          numberOfLines={1}
          style={[styles.label, { color: kind === 'own' ? (color ?? palette.chalk) : palette.chalk }, kind === 'host' ? styles.labelBelow : styles.labelAbove, labelStyle]}>
          {label}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

/** The dashed line from this arena to the next game's host, redrawn from the transform. */
function TripLine({ view, from, to, width, height, color }: { view: View2D; from: { x: number; y: number }; to: { x: number; y: number }; width: number; height: number; color: string }) {
  const { z, tx, ty } = view;
  const props = useAnimatedProps(() => ({
    x1: from.x * z.get() + tx.get(),
    y1: from.y * z.get() + ty.get(),
    x2: to.x * z.get() + tx.get(),
    y2: to.y * z.get() + ty.get(),
  }));
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <AnimatedLine animatedProps={props} stroke={color} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.8} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22, paddingHorizontal: SIDE },
  title: { ...textStyle.sectionLabel, marginBottom: 8, paddingHorizontal: 4 },
  card: { padding: PAD, borderRadius: radius.lg, backgroundColor: surfaces.card, gap: 10 },
  viewport: { overflow: 'hidden', borderRadius: radius.md },
  marker: { position: 'absolute', left: 0, top: 0, width: HIT, height: HIT },
  hit: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
  ring: { position: 'absolute', borderWidth: 1.5 },
  label: { position: 'absolute', left: -12, width: HIT + 24, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 11 },
  labelAbove: { top: -4 },
  labelBelow: { top: HIT - 4 },
  reset: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: withAlpha(palette.arena, 0.7) },
  resetText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.chalk },
  foot: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  arena: { fontFamily: fonts.displayBold, fontSize: 20, color: palette.chalk },
  city: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  trip: { alignItems: 'flex-end' },
  tripLabel: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  tripValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  hint: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
});
