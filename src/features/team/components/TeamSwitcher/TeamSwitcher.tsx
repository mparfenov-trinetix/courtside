import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSkeleton, StarIcon } from '@/components';
import { useTeams } from '@/hooks';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state';

const COLUMNS = 3;

/** A bottom sheet with every team: tap one to look at it on the home screen. Opened by holding the team card. */
export function TeamSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: teams, isPending } = useTeams();
  const { currentTeamId, favoriteTeamId, viewTeam } = useTeamStore();
  const sorted = [...(teams ?? [])].sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title}>Switch team</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        {isPending ? (
          <ListSkeleton count={8} />
        ) : (
          <FlatList
            data={sorted}
            numColumns={COLUMNS}
            keyExtractor={(t) => t.id}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.column}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const on = item.id === currentTeamId;
              return (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    viewTeam(item.id);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={item.displayName}
                  style={({ pressed }) => [
                    styles.tile,
                    on && { borderColor: withAlpha(palette.chalk, 0.5), backgroundColor: withAlpha('#FFFFFF', 0.1) },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Image source={item.logoDark || item.logo} style={styles.logo} contentFit="contain" />
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.id === favoriteTeamId && (
                    <View style={styles.star}>
                      <StarIcon color="#FBBF24" size={14} filled />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: palette.arena, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  title: { fontFamily: fonts.display, fontSize: 30, color: palette.chalk },
  done: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.muted },
  column: { gap: 8, marginBottom: 8 },
  tile: {
    flex: 1 / COLUMNS,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: withAlpha('#FFFFFF', 0.05),
  },
  logo: { width: 56, height: 56 },
  name: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk, paddingHorizontal: 6 },
  star: { position: 'absolute', top: 8, right: 8 },
});
