"""
Process raw audio recordings from raw_sounds/ into gapless, loudness-matched
OGG Vorbis loops in assets/sounds/ for Ambient Sleep.

Usage:
  python scripts/process-sounds.py              # Process all files found in raw_sounds/
  python scripts/process-sounds.py rain ocean   # Process only specific sound IDs

Supported input formats: .wav, .flac, .mp3, .m4a, .ogg, .aac, .aiff
Expected filenames in raw_sounds/:
  rain.*, thunder.*, ocean.*, brown_noise.*, box_fan.*, campfire.*, wind.*, crickets.*
"""
import os
import sys
import subprocess
import tempfile
import wave
import numpy as np

SR = 44100
CHANNELS = 2
TARGET_DURATION = 45.0   # Max final loop length in seconds
CROSSFADE_SEC = 4.0      # Equal-power overlap crossfade for seamless looping
TARGET_LUFS = -16.0      # Consistent perceived loudness across all channels
SUPPORTED_EXTS = (".wav", ".flac", ".mp3", ".m4a", ".ogg", ".aac", ".aiff")
SOUND_IDS = [
    "rain",
    "thunder",
    "ocean",
    "brown_noise",
    "box_fan",
    "campfire",
    "wind",
    "crickets",
]

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT_DIR, "raw_sounds")
OUT_DIR = os.path.join(ROOT_DIR, "assets", "sounds")


def decode_to_stereo_f32(input_path: str) -> np.ndarray:
    """Decode any FFmpeg-supported audio file to 44.1kHz stereo float32 numpy array."""
    cmd = [
        "ffmpeg",
        "-v", "error",
        "-i", input_path,
        "-ac", str(CHANNELS),
        "-ar", str(SR),
        "-f", "f32le",
        "pipe:1",
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    audio = np.frombuffer(res.stdout, dtype=np.float32)
    n_frames = len(audio) // CHANNELS
    return audio[: n_frames * CHANNELS].reshape((n_frames, CHANNELS)).copy()


def make_seamless_loop(audio: np.ndarray, max_dur: float = TARGET_DURATION, fade_sec: float = CROSSFADE_SEC) -> np.ndarray:
    """
    Trim to a clean central segment (if longer than max_dur + fade_sec) and
    overlap-add the tail onto the head with an equal-power sin/cos crossfade.
    """
    total_sec = audio.shape[0] / SR
    if total_sec < 2.0:
        raise ValueError(f"Audio clip is too short ({total_sec:.1f}s); provide at least 6+ seconds.")

    # Use a proportional crossfade if the source clip is short
    actual_fade = min(fade_sec, total_sec * 0.25)
    fade_n = int(actual_fade * SR)

    # If the recording is longer than needed, take from the middle (avoids start/end handling noise)
    needed_n = int((max_dur + actual_fade) * SR)
    if audio.shape[0] > needed_n:
        start = (audio.shape[0] - needed_n) // 2
        audio = audio[start : start + needed_n]

    head = audio[:fade_n]
    tail = audio[-fade_n:]
    t = np.linspace(0.0, np.pi / 2.0, fade_n, dtype=np.float32)[:, None]

    # Equal-power crossfade preserves perceived loudness across the loop seam
    blended = head * np.sin(t) + tail * np.cos(t)
    looped = audio[:-fade_n].copy()
    looped[:fade_n] = blended
    return looped


def encode_loudnorm_ogg(stereo: np.ndarray, out_ogg: str) -> None:
    """Loudness-normalize to -16 LUFS and encode to gapless OGG Vorbis."""
    peak = float(np.max(np.abs(stereo)))
    if peak > 1e-6:
        stereo = stereo * (0.95 / peak)
    pcm = (np.clip(stereo, -1.0, 1.0) * 32767.0).astype(np.int16)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name

    try:
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes(pcm.tobytes())

        cmd = [
            "ffmpeg",
            "-y",
            "-v", "error",
            "-i", wav_path,
            "-af", f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11",
            "-c:a", "libvorbis",
            "-q:a", "5",
            out_ogg,
        ]
        subprocess.run(cmd, check=True)
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)


def find_raw_file(sound_id: str) -> str | None:
    for ext in SUPPORTED_EXTS:
        candidate = os.path.join(RAW_DIR, f"{sound_id}{ext}")
        if os.path.exists(candidate):
            return candidate
    return None


def main() -> None:
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    requested = sys.argv[1:] if len(sys.argv) > 1 else SOUND_IDS
    unknown = [s for s in requested if s not in SOUND_IDS]
    if unknown:
        print(f"Unknown sound ID(s): {', '.join(unknown)}")
        print(f"Valid IDs: {', '.join(SOUND_IDS)}")
        sys.exit(1)

    processed = 0
    for sound_id in requested:
        raw_path = find_raw_file(sound_id)
        if not raw_path:
            continue
        out_ogg = os.path.join(OUT_DIR, f"{sound_id}.ogg")
        print(f"Processing {os.path.basename(raw_path)} -> assets/sounds/{sound_id}.ogg ...")
        audio = decode_to_stereo_f32(raw_path)
        looped = make_seamless_loop(audio)
        encode_loudnorm_ogg(looped, out_ogg)
        dur = looped.shape[0] / SR
        size_kb = os.path.getsize(out_ogg) / 1024.0
        print(f"  Done ({dur:.1f}s gapless loop, {size_kb:.1f} KB)")
        processed += 1

    if processed == 0:
        print(f"No raw audio files found in {RAW_DIR}.")
        print("Drop raw recordings named like rain.wav, ocean.mp3, campfire.flac into raw_sounds/ and re-run.")
    else:
        print(f"\nProcessed {processed} sound(s). Reload the app in Metro to hear your updated loops!")


if __name__ == "__main__":
    main()
