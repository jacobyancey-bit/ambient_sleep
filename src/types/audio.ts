import { AVPlaybackSource } from 'expo-av';

export type SoundCategory = 'nature' | 'noise' | 'ambience';

export interface AmbientSound {
  id: string;
  name: string;
  icon: string;
  category: SoundCategory;
  /**
   * Bundled offline stereo looping audio asset.
   */
  audioSource: AVPlaybackSource;
  defaultVolume: number;
}

export interface ChannelState {
  soundId: string;
  isPlaying: boolean;
  volume: number; // 0.0 to 1.0
}

export interface SoundPreset {
  id: string;
  name: string;
  description: string;
  channels: { soundId: string; volume: number }[];
}

export const SOUND_LIBRARY: AmbientSound[] = [
  {
    id: 'rain',
    name: 'Heavy Rain',
    icon: '🌧️',
    category: 'nature',
    audioSource: require('../../assets/sounds/rain.ogg'),
    defaultVolume: 0.75,
  },
  {
    id: 'thunder',
    name: 'Distant Thunder',
    icon: '⚡',
    category: 'nature',
    audioSource: require('../../assets/sounds/thunder.ogg'),
    defaultVolume: 0.5,
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: '🌊',
    category: 'nature',
    audioSource: require('../../assets/sounds/ocean.ogg'),
    defaultVolume: 0.65,
  },
  {
    id: 'brown_noise',
    name: 'Brown Noise',
    icon: '📻',
    category: 'noise',
    audioSource: require('../../assets/sounds/brown_noise.ogg'),
    defaultVolume: 0.8,
  },
  {
    id: 'box_fan',
    name: 'Box Fan',
    icon: '💨',
    category: 'noise',
    audioSource: require('../../assets/sounds/box_fan.ogg'),
    defaultVolume: 0.6,
  },
  {
    id: 'campfire',
    name: 'Campfire',
    icon: '🔥',
    category: 'ambience',
    audioSource: require('../../assets/sounds/campfire.ogg'),
    defaultVolume: 0.5,
  },
  {
    id: 'wind',
    name: 'Night Wind',
    icon: '🍃',
    category: 'nature',
    audioSource: require('../../assets/sounds/wind.ogg'),
    defaultVolume: 0.45,
  },
  {
    id: 'crickets',
    name: 'Crickets',
    icon: '🦗',
    category: 'ambience',
    audioSource: require('../../assets/sounds/crickets.ogg'),
    defaultVolume: 0.35,
  },
];

export const PRESET_MIXES: SoundPreset[] = [
  {
    id: 'rainstorm',
    name: 'Rainy Night',
    description: 'Rain & low rolling thunder',
    channels: [
      { soundId: 'rain', volume: 0.75 },
      { soundId: 'thunder', volume: 0.45 },
    ],
  },
  {
    id: 'deep_sleep',
    name: 'Deep Sleep',
    description: 'Brown noise with gentle box fan',
    channels: [
      { soundId: 'brown_noise', volume: 0.8 },
      { soundId: 'box_fan', volume: 0.4 },
    ],
  },
  {
    id: 'cabin',
    name: 'Cozy Cabin',
    description: 'Campfire crackle with distant rain',
    channels: [
      { soundId: 'campfire', volume: 0.6 },
      { soundId: 'rain', volume: 0.5 },
      { soundId: 'wind', volume: 0.3 },
    ],
  },
];

