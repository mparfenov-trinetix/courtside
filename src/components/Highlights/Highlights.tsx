import { requireOptionalNativeModule } from 'expo';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { createElement, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { clipLength, type GameVideo } from '@/lib/espn';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { PlayIcon } from '../Icons';
import { THUMB_H, THUMB_W } from './constants';
import { HighlightCardsSkeleton } from './Highlights.skeleton';
import type { PlayerPhase } from './HighlightPlayer';

/**
 * Loaded when a clip is first opened, not at start-up: `expo-video` is a native module, and a build made before it was added would
 * fail to import it (and take the whole app down with it, since `@/components` is imported everywhere). Without it the row says so.
 */
function loadPlayer(): typeof import('./HighlightPlayer').HighlightPlayer | null {
  // The JS of expo-video imports fine without its native half; making a player is what throws. So ask for the native module first.
  if (!requireOptionalNativeModule('ExpoVideo')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./HighlightPlayer') as typeof import('./HighlightPlayer')).HighlightPlayer;
  } catch {
    return null;
  }
}

/**
 * A row of highlight clips: thumbnails with their length and headline. A tap loads the clip (the thumbnail shows it), and once it has a
 * picture the system's full-screen player takes over. Tapping another clip meanwhile switches to it. A clip that will not load says so
 * on its thumbnail, with Retry and a link to its page on espn.com. Renders nothing without clips, so a caller can place it unconditionally.
 */
export function Highlights({
  title = 'Highlights',
  videos,
  accent = palette.chalk,
  parentPadding = 0,
  loading = false,
}: {
  title?: string;
  videos: GameVideo[];
  accent?: string;
  /** Side padding of the parent, cancelled so the row still runs edge to edge while its first card lines up with the parent's content. */
  parentPadding?: number;
  /** The clips are still being read: the title with placeholders where the cards will be. Ignored once there are clips. */
  loading?: boolean;
}) {
  // `attempt` changes after a failure, which gives the retry a fresh player.
  const [request, setRequest] = useState<{ index: number; attempt: number } | null>(null);
  const [phase, setPhase] = useState<PlayerPhase>('loading');
  const player = request ? loadPlayer() : null;
  if (videos.length === 0 && !loading) return null;

  const choose = (index: number) => {
    setRequest({ index, attempt: (request?.attempt ?? 0) + (phase === 'failed' ? 1 : 0) });
    setPhase('loading');
  };
  return (
    <View style={[styles.wrap, { marginHorizontal: -parentPadding }]}>
      <Text style={styles.title}>{title}</Text>
      {videos.length === 0 ? <HighlightCardsSkeleton /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {videos.map((v, i) => (
          <Pressable
            key={v.id}
            onPress={() => choose(i)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${v.headline}`}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
            <View style={styles.thumb}>
              {v.thumbnail ? <Image source={v.thumbnail} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : null}
              <View style={[styles.play, { backgroundColor: withAlpha('#000000', 0.5) }]}>
                <PlayIcon size={18} color={palette.chalk} />
              </View>
              <Text style={styles.length}>{clipLength(v.duration)}</Text>
              {v.fullGame ? <Text style={[styles.badge, { color: accent }]}>FULL GAME</Text> : null}
              {request?.index === i && phase === 'loading' ? (
                <View style={styles.veil} accessibilityLabel="Loading video">
                  <ActivityIndicator color={palette.chalk} />
                </View>
              ) : null}
              {request?.index === i && phase === 'failed' ? (
                <View style={styles.veil}>
                  <Text style={styles.failedText}>Couldn’t load</Text>
                  <View style={styles.failedRow}>
                    <Pressable onPress={() => choose(i)} hitSlop={8} accessibilityRole="button" style={styles.pill}>
                      <Text style={[styles.pillText, { color: accent }]}>Retry</Text>
                    </Pressable>
                    {v.webUrl ? (
                      <Pressable
                        onPress={() => WebBrowser.openBrowserAsync(v.webUrl).catch(() => {})}
                        hitSlop={8}
                        accessibilityRole="link"
                        accessibilityLabel="Watch on ESPN">
                        <Text style={[styles.pill, styles.pillText, { color: palette.chalk }]}>ESPN ↗</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
            <Text style={styles.headline} numberOfLines={2}>
              {v.headline}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* The system's player takes over the whole screen by itself; the Modal is only for a build without the video module. */}
      {request && player
        ? createElement(player, {
            key: request.attempt,
            videos,
            index: request.index,
            onIndex: (index: number) => setRequest((r) => (r ? { ...r, index } : r)),
            onPhase: setPhase,
            onDismiss: () => setRequest(null),
          })
        : null}
      <Modal visible={!!request && !player} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setRequest(null)}>
        <View style={styles.unavailable}>
          <Text style={styles.unavailableText}>Video needs a new build of the app (expo-video).</Text>
          <Pressable onPress={() => setRequest(null)} hitSlop={14} accessibilityRole="button">
            <Text style={[styles.unavailableText, { color: accent }]}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Room above and below: a row of thumbnails runs into whatever sits next to it without it.
  wrap: { marginTop: 18, marginBottom: 26 },
  title: { ...textStyle.sectionLabel, marginBottom: 8, paddingHorizontal: 16 },
  row: { paddingHorizontal: 16, gap: 10 },
  card: { width: THUMB_W },
  thumb: { width: THUMB_W, height: THUMB_H, borderRadius: 12, overflow: 'hidden', backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  length: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: palette.chalk,
    backgroundColor: withAlpha('#000000', 0.6),
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    left: 6,
    top: 6,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.6,
    backgroundColor: withAlpha('#000000', 0.6),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Over the thumbnail while its clip loads or when it failed; the clip is not the one playing, so nothing of the player is under it.
  veil: { ...StyleSheet.absoluteFill, backgroundColor: withAlpha('#000000', 0.62), alignItems: 'center', justifyContent: 'center', gap: 8 },
  failedText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.chalk },
  failedRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: withAlpha('#FFFFFF', 0.14), overflow: 'hidden' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  unavailable: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  unavailableText: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.chalk, textAlign: 'center' },
  headline: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: palette.chalk, marginTop: 6 },
});
