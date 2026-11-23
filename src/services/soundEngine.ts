import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { SOUND_LIBRARY, AmbientSound } from '../types/audio';

class SoundEngineManager {
  private sounds: Map<string, Audio.Sound> = new Map();
  private isConfigured: boolean = false;
  private isMasterPaused: boolean = false;

  /**
   * Initializes audio mode on Android so sounds keep playing
   * with the screen locked or app backgrounded.
   */
  async initialize(): Promise<void> {
    if (this.isConfigured) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
      this.isConfigured = true;
    } catch (error) {
      console.warn('Failed to configure audio background mode:', error);
    }
  }

  /**
   * Toggles playback for a specific ambient sound channel.
   */
  async toggleSound(sound: AmbientSound, volume: number = sound.defaultVolume): Promise<boolean> {
    await this.initialize();

    const existing = this.sounds.get(sound.id);

    if (existing) {
      const status = await existing.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await existing.pauseAsync();
        return false;
      } else if (status.isLoaded) {
        await existing.setVolumeAsync(volume);
        await existing.playAsync();
        return true;
      }
    }

    // Load sound for the first time
    try {
      const { sound: soundObject } = await Audio.Sound.createAsync(
        sound.audioSource,
        {
          isLooping: true,
          volume,
          shouldPlay: true,
        }
      );

      this.sounds.set(sound.id, soundObject);
      return true;
    } catch (error) {
      console.error(`Failed to load audio for ${sound.name}:`, error);
      return false;
    }
  }

  /**
   * Sets individual channel volume (0.0 to 1.0).
   */
  async setChannelVolume(soundId: string, volume: number): Promise<void> {
    const sound = this.sounds.get(soundId);
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      }
    }
  }

  /**
   * Pauses all currently playing channels without unloading them.
   */
  async pauseAll(): Promise<void> {
    this.isMasterPaused = true;
    const promises: Promise<unknown>[] = [];

    this.sounds.forEach((sound) => {
      promises.push(
        sound.getStatusAsync().then((status) => {
          if (status.isLoaded && status.isPlaying) {
            return sound.pauseAsync();
          }
        })
      );
    });

    await Promise.all(promises);
  }

  /**
   * Resumes playback for previously active channels.
   */
  async resumeAll(activeSoundIds: string[]): Promise<void> {
    this.isMasterPaused = false;
    const promises: Promise<unknown>[] = [];

    activeSoundIds.forEach((id) => {
      const sound = this.sounds.get(id);
      if (sound) {
        promises.push(sound.playAsync());
      }
    });

    await Promise.all(promises);
  }

  /**
   * Gradually fades out all playing channels over durationMs (ideal for sleep timer).
   */
  async fadeOutAll(durationMs: number = 3000): Promise<void> {
    const steps = 15;
    const stepInterval = durationMs / steps;

    // Capture each playing channel's starting volume so quiet tracks fade smoothly
    const initialVolumes: Array<{ sound: Audio.Sound; volume: number }> = [];
    for (const sound of this.sounds.values()) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        initialVolumes.push({ sound, volume: status.volume ?? 1 });
      }
    }

    for (let i = steps - 1; i >= 0; i--) {
      const factor = i / steps;
      await Promise.all(
        initialVolumes.map(({ sound, volume }) => sound.setVolumeAsync(volume * factor))
      );
      await new Promise((resolve) => setTimeout(resolve, stepInterval));
    }

    await this.pauseAll();
  }

  /**
   * Stops and releases all audio resources.
   */
  async unloadAll(): Promise<void> {
    const promises: Promise<unknown>[] = [];
    this.sounds.forEach((sound) => {
      promises.push(sound.unloadAsync());
    });
    await Promise.all(promises);
    this.sounds.clear();
  }
}

export const SoundEngine = new SoundEngineManager();

