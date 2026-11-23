import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../tokens';
import { AppText } from './common/AppText';

export interface MasterBottomBarProps {
  activeCount: number;
  isPlayingAll: boolean;
  timerFormatted: string | null;
  onToggleMasterPlay: () => void;
  onOpenTimer: () => void;
}

export const MasterBottomBar: React.FC<MasterBottomBarProps> = ({
  activeCount,
  isPlayingAll,
  timerFormatted,
  onToggleMasterPlay,
  onOpenTimer,
}) => {
  const { colors, spacing, radii, elevations } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: '#131B2E',
          borderTopColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          ...elevations[8],
        },
      ]}
    >
      <View style={styles.leftCol}>
        <AppText variant="titleSmall" style={{ fontWeight: '600' }}>
          {activeCount > 0 ? `${activeCount} sounds active` : 'No sounds playing'}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {timerFormatted ? `Timer: ${timerFormatted}` : 'Timer: Off'}
        </AppText>
      </View>

      <View style={styles.rightActions}>
        <Pressable
          onPress={onOpenTimer}
          style={[
            styles.iconButton,
            {
              backgroundColor: timerFormatted ? colors.primary : colors.surfaceVariant,
              borderRadius: radii.full,
              marginRight: spacing.sm,
            },
          ]}
          hitSlop={8}
        >
          <AppText style={{ fontSize: 18 }}>⏱️</AppText>
        </Pressable>

        <Pressable
          onPress={onToggleMasterPlay}
          disabled={activeCount === 0}
          style={[
            styles.playButton,
            {
              backgroundColor: activeCount === 0 ? colors.surfaceVariant : colors.primary,
              borderRadius: radii.full,
            },
          ]}
          hitSlop={8}
        >
          <AppText
            variant="button"
            color={activeCount === 0 ? colors.textMuted : colors.onPrimary}
          >
            {isPlayingAll ? '⏸ Pause' : '▶ Play'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  leftCol: {
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    paddingHorizontal: 18,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

