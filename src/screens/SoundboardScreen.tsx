import React, { useState, useEffect } from 'react';
import { View, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../tokens';
import { SOUND_LIBRARY, PRESET_MIXES, AmbientSound, SoundPreset } from '../types/audio';
import { ScreenContainer } from '../components/common/ScreenContainer';
import { AppText } from '../components/common/AppText';
import { SoundTile } from '../components/SoundTile';
import { MasterBottomBar } from '../components/MasterBottomBar';
import { TimerModal } from '../components/TimerModal';
import { SoundEngine } from '../services/soundEngine';
import { SleepTimer } from '../services/sleepTimer';

export const SoundboardScreen: React.FC = () => {
  const { colors, spacing, radii } = useTheme();

  // Active channel states: soundId -> { isPlaying, volume }
  const [activeChannels, setActiveChannels] = useState<Map<string, number>>(new Map());
  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerModalVisible, setIsTimerModalVisible] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      SoundEngine.unloadAll();
      SleepTimer.stopTimer();
    };
  }, []);

  const handleToggleSound = async (sound: AmbientSound) => {
    const isCurrentlyActive = activeChannels.has(sound.id);

    if (isCurrentlyActive) {
      await SoundEngine.toggleSound(sound);
      setActiveChannels((prev) => {
        const next = new Map(prev);
        next.delete(sound.id);
        if (next.size === 0) setIsMasterPlaying(false);
        return next;
      });
    } else {
      const vol = sound.defaultVolume;
      const started = await SoundEngine.toggleSound(sound, vol);
      if (started) {
        setActiveChannels((prev) => {
          const next = new Map(prev);
          next.set(sound.id, vol);
          return next;
        });
        setIsMasterPlaying(true);
      }
    }
  };

  const handleVolumeChange = async (soundId: string, volume: number) => {
    await SoundEngine.setChannelVolume(soundId, volume);
    setActiveChannels((prev) => {
      const next = new Map(prev);
      next.set(soundId, volume);
      return next;
    });
  };

  const handleApplyPreset = async (preset: SoundPreset) => {
    // 1. Pause current
    await SoundEngine.pauseAll();

    const nextChannels = new Map<string, number>();

    for (const ch of preset.channels) {
      const sound = SOUND_LIBRARY.find((s) => s.id === ch.soundId);
      if (sound) {
        await SoundEngine.toggleSound(sound, ch.volume);
        nextChannels.set(ch.soundId, ch.volume);
      }
    }

    setActiveChannels(nextChannels);
    setIsMasterPlaying(nextChannels.size > 0);
  };

  const handleToggleMasterPlay = async () => {
    if (isMasterPlaying) {
      await SoundEngine.pauseAll();
      setIsMasterPlaying(false);
    } else {
      const soundIds = Array.from(activeChannels.keys());
      await SoundEngine.resumeAll(soundIds);
      setIsMasterPlaying(true);
    }
  };

  const handleStartTimer = (minutes: number) => {
    SleepTimer.startTimer(
      minutes,
      (secs) => setTimerSeconds(secs),
      () => {
        setIsMasterPlaying(false);
        setTimerSeconds(0);
      }
    );
  };

  const handleCancelTimer = () => {
    SleepTimer.stopTimer();
    setTimerSeconds(0);
  };

  const activeCount = activeChannels.size;
  const timerFormatted = timerSeconds > 0 ? SleepTimer.formatTime() : null;

  return (
    <ScreenContainer scrollable={false}>
      <View style={[styles.header, { padding: spacing.lg }]}>
        <AppText variant="titleMedium" style={{ fontWeight: '700' }}>
          Ambient Sleep
        </AppText>
        <AppText variant="bodySmall" color={colors.textSecondary}>
          Zero subscriptions • Seamless background loops
        </AppText>

        {/* Preset Mixes Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetScroll}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
        >
          {PRESET_MIXES.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => handleApplyPreset(preset)}
              style={[
                styles.presetPill,
                { backgroundColor: colors.surfaceVariant, borderRadius: radii.full },
              ]}
              android_ripple={{ color: colors.ripple }}
            >
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                ✨ {preset.name}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 2-Column Sound Grid */}
      <FlatList
        data={SOUND_LIBRARY}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SoundTile
            sound={item}
            isPlaying={activeChannels.has(item.id)}
            volume={activeChannels.get(item.id) ?? item.defaultVolume}
            onToggle={() => handleToggleSound(item)}
            onVolumeChange={(vol) => handleVolumeChange(item.id, vol)}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: spacing.sm }]}
      />

      {/* Master Bottom Bar */}
      <MasterBottomBar
        activeCount={activeCount}
        isPlayingAll={isMasterPlaying}
        timerFormatted={timerFormatted}
        onToggleMasterPlay={handleToggleMasterPlay}
        onOpenTimer={() => setIsTimerModalVisible(true)}
      />

      {/* Sleep Timer Picker Modal */}
      <TimerModal
        visible={isTimerModalVisible}
        activeSeconds={timerSeconds}
        onClose={() => setIsTimerModalVisible(false)}
        onSelectDuration={handleStartTimer}
        onCancelTimer={handleCancelTimer}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: 4,
  },
  presetScroll: {
    marginTop: 10,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
});

