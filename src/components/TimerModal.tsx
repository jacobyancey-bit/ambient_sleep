import React from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../tokens';
import { AppText } from './common/AppText';
import { AppButton } from './common/AppButton';

export interface TimerModalProps {
  visible: boolean;
  activeSeconds: number;
  onClose: () => void;
  onSelectDuration: (minutes: number) => void;
  onCancelTimer: () => void;
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

export const TimerModal: React.FC<TimerModalProps> = ({
  visible,
  activeSeconds,
  onClose,
  onSelectDuration,
  onCancelTimer,
}) => {
  const { colors, spacing, radii } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <AppText variant="titleMedium" style={{ marginBottom: spacing.xs }}>
            Sleep Timer
          </AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
            Music will gently fade out when the timer ends.
          </AppText>

          <View style={styles.optionsGrid}>
            {DURATIONS.map((minutes) => {
              const isActive = activeSeconds > 0 && Math.round(activeSeconds / 60) === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => {
                    onSelectDuration(minutes);
                    onClose();
                  }}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                      borderRadius: radii.md,
                      paddingVertical: spacing.md,
                    },
                  ]}
                >
                  <AppText
                    variant="button"
                    color={isActive ? colors.onPrimary : colors.textPrimary}
                  >
                    {minutes} min
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {activeSeconds > 0 && (
            <AppButton
              title="Turn Off Timer"
              variant="outline"
              onPress={() => {
                onCancelTimer();
                onClose();
              }}
              style={{ marginTop: spacing.md }}
              textStyle={{ color: colors.error }}
            />
          )}

          <AppButton
            title="Close"
            variant="text"
            onPress={onClose}
            style={{ marginTop: spacing.xs }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionBtn: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
  },
});

