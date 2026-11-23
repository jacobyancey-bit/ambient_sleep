import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../tokens';
import { AmbientSound } from '../types/audio';
import { AppText } from './common/AppText';

export interface SoundTileProps {
  sound: AmbientSound;
  isPlaying: boolean;
  volume: number;
  onToggle: () => void;
  onVolumeChange: (newVolume: number) => void;
}

export const SoundTile: React.FC<SoundTileProps> = ({
  sound,
  isPlaying,
  volume,
  onToggle,
  onVolumeChange,
}) => {
  const { colors, spacing, radii, elevations } = useTheme();

  const handleVolumeStep = (delta: number, e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    const next = Math.max(0.1, Math.min(1.0, Math.round((volume + delta) * 10) / 10));
    onVolumeChange(next);
  };

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.card,
        {
          backgroundColor: isPlaying ? '#162032' : colors.surface,
          borderRadius: radii.lg,
          borderColor: isPlaying ? colors.primary : 'transparent',
          padding: spacing.md,
          ...elevations[isPlaying ? 4 : 1],
        },
      ]}
      android_ripple={{ color: colors.ripple }}
    >
      <View style={styles.topRow}>
        <AppText style={styles.icon}>{sound.icon}</AppText>
        {isPlaying && (
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
        )}
      </View>

      <AppText
        variant="titleSmall"
        color={isPlaying ? colors.textPrimary : colors.textSecondary}
        style={{ marginTop: spacing.sm, fontWeight: isPlaying ? '600' : '500' }}
        numberOfLines={1}
      >
        {sound.name}
      </AppText>

      {isPlaying ? (
        <View style={[styles.volumeControl, { marginTop: spacing.sm }]}>
          <Pressable
            onPress={(e) => handleVolumeStep(-0.1, e)}
            hitSlop={6}
            style={[styles.stepBtn, { backgroundColor: colors.surfaceVariant }]}
          >
            <AppText variant="caption" color={colors.textPrimary}>-</AppText>
          </Pressable>

          <View style={styles.volumeBarTrack}>
            <View
              style={[
                styles.volumeBarFill,
                {
                  width: `${Math.round(volume * 100)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>

          <Pressable
            onPress={(e) => handleVolumeStep(0.1, e)}
            hitSlop={6}
            style={[styles.stepBtn, { backgroundColor: colors.surfaceVariant }]}
          >
            <AppText variant="caption" color={colors.textPrimary}>+</AppText>
          </Pressable>
        </View>
      ) : (
        <AppText
          variant="caption"
          color={colors.textMuted}
          style={{ marginTop: spacing.xs }}
        >
          Tap to play
        </AppText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 124,
    borderWidth: 1.5,
    margin: 6,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  icon: {
    fontSize: 30,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

