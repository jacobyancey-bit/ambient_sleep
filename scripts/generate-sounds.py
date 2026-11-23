"""
Generate seamless-looping stereo ambient sleep audio files in assets/sounds/.
Uses NumPy DSP synthesis + FFmpeg MP3 encoding (128kbps stereo).
"""
import os
import subprocess
import tempfile
import wave
import numpy as np

SR = 44100
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "sounds")
os.makedirs(OUT_DIR, exist_ok=True)


def normalize_stereo(audio: np.ndarray, peak: float = 0.85) -> np.ndarray:
    max_val = np.max(np.abs(audio))
    if max_val > 1e-9:
        audio = audio * (peak / max_val)
    return np.clip(audio, -0.99, 0.99)


def crossfade_loop(audio: np.ndarray, fade_sec: float = 2.0) -> np.ndarray:
    """Overlap-add crossfade tail onto head for a click-free seamless loop."""
    fade_n = int(fade_sec * SR)
    if audio.shape[0] <= fade_n * 2:
        return audio
    head = audio[:fade_n]
    tail = audio[-fade_n:]
    t = np.linspace(0.0, np.pi / 2.0, fade_n)[:, None]
    # Equal-power crossfade
    blended = head * np.sin(t) + tail * np.cos(t)
    result = audio[:-fade_n].copy()
    result[:fade_n] = blended
    return result


def fft_shaped_noise(duration: float, slope: float, low_cut: float = 20.0, high_cut: float = 18000.0, seed: int = 0) -> np.ndarray:
    """Generate seamlessly periodic stereo noise with 1/f^slope amplitude spectrum."""
    rng = np.random.default_rng(seed)
    n = int(duration * SR)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    mag = np.ones_like(freqs)
    nonzero = freqs > 0
    mag[nonzero] = 1.0 / (freqs[nonzero] ** slope)
    mag[0] = 0.0

    # Smooth high-pass and low-pass roll-off
    if low_cut > 0:
        hp = (freqs / low_cut) ** 2 / (1.0 + (freqs / low_cut) ** 2)
        mag *= hp
    if high_cut < SR / 2:
        lp = 1.0 / (1.0 + (freqs / high_cut) ** 2)
        mag *= lp

    channels = []
    for _ in range(2):
        phases = rng.uniform(0, 2 * np.pi, size=len(freqs))
        spectrum = mag * (np.cos(phases) + 1j * np.sin(phases))
        spectrum[0] = 0.0
        if n % 2 == 0:
            spectrum[-1] = np.abs(spectrum[-1])
        sig = np.fft.irfft(spectrum, n=n)
        channels.append(sig)
    return np.stack(channels, axis=1)


def bandpass_fft(stereo: np.ndarray, center: float, q: float) -> np.ndarray:
    n = stereo.shape[0]
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    bw = center / max(q, 0.1)
    resp = 1.0 / np.sqrt(1.0 + ((freqs - center) / (bw * 0.5)) ** 2)
    resp[0] = 0.0
    out = np.zeros_like(stereo)
    for c in range(2):
        spec = np.fft.rfft(stereo[:, c]) * resp
        out[:, c] = np.fft.irfft(spec, n=n)
    return out


def lowpass_fft(stereo: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    n = stereo.shape[0]
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    resp = 1.0 / np.sqrt(1.0 + (freqs / cutoff) ** (2 * order))
    resp[0] = 0.0
    out = np.zeros_like(stereo)
    for c in range(2):
        spec = np.fft.rfft(stereo[:, c]) * resp
        out[:, c] = np.fft.irfft(spec, n=n)
    return out


def make_brown_noise() -> np.ndarray:
    # True 1/f^2 power (1/f amplitude) brown noise with warm sub-bass
    audio = fft_shaped_noise(duration=20.0, slope=1.0, low_cut=28.0, high_cut=1400.0, seed=101)
    # Slight stereo correlation so it feels wide but cohesive
    mid = (audio[:, 0] + audio[:, 1]) * 0.5
    side = (audio[:, 0] - audio[:, 1]) * 0.35
    audio = np.stack([mid + side, mid - side], axis=1)
    return normalize_stereo(audio, 0.80)


def make_box_fan() -> np.ndarray:
    dur = 16.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    # Airflow bed (warm pink-brown hybrid)
    airflow = fft_shaped_noise(dur, slope=0.75, low_cut=45.0, high_cut=2600.0, seed=202)
    # Subtle blade whoosh modulation (exact integer cycles for seamless loop)
    lfo = 1.0 + 0.04 * np.sin(2 * np.pi * (1.0 / 4.0) * t) + 0.025 * np.sin(2 * np.pi * 15.0 * t)
    airflow *= lfo[:, None]
    # Gentle 60Hz & 120Hz AC motor hum (very soft)
    hum = 0.035 * np.sin(2 * np.pi * 60.0 * t) + 0.02 * np.sin(2 * np.pi * 120.0 * t)
    audio = airflow + hum[:, None]
    mid = (audio[:, 0] + audio[:, 1]) * 0.5
    side = (audio[:, 0] - audio[:, 1]) * 0.25
    return normalize_stereo(np.stack([mid + side, mid - side], axis=1), 0.78)


def make_rain() -> np.ndarray:
    dur = 20.0
    n = int(dur * SR)
    rng = np.random.default_rng(303)
    # Steady rain sheet (pink-ish noise rolled off nicely)
    sheet = fft_shaped_noise(dur, slope=0.45, low_cut=120.0, high_cut=6800.0, seed=304)
    # Soft low rumble of heavy rain
    body = fft_shaped_noise(dur, slope=0.95, low_cut=45.0, high_cut=500.0, seed=305) * 0.35
    # Subtle droplet patter
    drops = np.zeros((n, 2))
    num_drops = 900
    for _ in range(num_drops):
        pos = rng.integers(0, n - 400)
        length = rng.integers(80, 260)
        env = np.exp(-np.linspace(0, 6.0, length))
        freq = rng.uniform(1200, 4800)
        tt = np.arange(length) / SR
        drop = env * (0.6 * rng.standard_normal(length) + 0.4 * np.sin(2 * np.pi * freq * tt))
        amp = rng.uniform(0.015, 0.055)
        pan = rng.uniform(0.15, 0.85)
        drops[pos:pos + length, 0] += drop * amp * (1.0 - pan)
        drops[pos:pos + length, 1] += drop * amp * pan
    audio = sheet * 0.75 + body + drops
    return normalize_stereo(audio, 0.82)


def make_thunder() -> np.ndarray:
    dur = 24.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(404)
    # Very soft distant rain hush underneath
    bed = fft_shaped_noise(dur, slope=0.85, low_cut=40.0, high_cut=1200.0, seed=405) * 0.10
    # Deep rumble noise source
    rumble_src = fft_shaped_noise(dur, slope=1.15, low_cut=24.0, high_cut=160.0, seed=406)
    mid_src = fft_shaped_noise(dur, slope=0.9, low_cut=60.0, high_cut=420.0, seed=407)

    # 3 distant thunder rolls spaced naturally across 24s
    env = np.zeros(n)
    mid_env = np.zeros(n)
    events = [(2.5, 4.5, 0.9), (10.5, 5.5, 1.0), (17.5, 4.2, 0.7)]
    for start, length, gain in events:
        dt = t - start
        mask = (dt >= 0) & (dt < length)
        x = dt[mask] / length
        # Attack + rolling decay with secondary echo bumps
        e = (np.sin(np.minimum(x * 8.0, 1.0) * np.pi / 2.0)
             * np.exp(-3.2 * x)
             * (1.0 + 0.35 * np.sin(2 * np.pi * 1.8 * x) ** 2))
        env[mask] += e * gain
        mid_env[mask] += (np.exp(-6.0 * x) * np.sin(np.minimum(x * 12.0, 1.0) * np.pi / 2.0)) * gain * 0.45

    audio = bed + rumble_src * env[:, None] * 1.8 + mid_src * mid_env[:, None] * 0.8
    return normalize_stereo(audio, 0.85)


def make_ocean() -> np.ndarray:
    dur = 24.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    # 3 full wave cycles over 24s (8s per wave) -> seamlessly periodic!
    phase = 2 * np.pi * (3.0 / dur) * t
    # Asymmetric wave swell: builds slowly, crests, recedes
    swell = 0.5 + 0.5 * np.sin(phase - 0.4 * np.cos(phase))
    swell_smooth = 0.25 + 0.75 * (swell ** 1.6)
    foam_env = np.clip((swell - 0.35) / 0.65, 0.0, 1.0) ** 1.8

    deep_surf = fft_shaped_noise(dur, slope=0.95, low_cut=35.0, high_cut=900.0, seed=501)
    foam = fft_shaped_noise(dur, slope=0.45, low_cut=500.0, high_cut=5500.0, seed=502)

    # Slight left-right phase offset for wide shoreline feel
    swell_r = 0.25 + 0.75 * ((0.5 + 0.5 * np.sin(phase - 0.15 - 0.4 * np.cos(phase - 0.15))) ** 1.6)
    audio = np.zeros((n, 2))
    audio[:, 0] = deep_surf[:, 0] * swell_smooth * 0.85 + foam[:, 0] * foam_env * 0.45
    audio[:, 1] = deep_surf[:, 1] * swell_r * 0.85 + foam[:, 1] * foam_env * 0.45
    return normalize_stereo(audio, 0.82)


def make_campfire() -> np.ndarray:
    dur = 20.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(601)
    # Warm low flame/ember bed with gentle flicker
    ember = fft_shaped_noise(dur, slope=1.0, low_cut=38.0, high_cut=380.0, seed=602)
    flicker = 0.78 + 0.14 * np.sin(2 * np.pi * 0.35 * t) + 0.08 * np.sin(2 * np.pi * 1.15 * t)
    ember *= flicker[:, None]

    # Soft hiss of burning wood
    hiss = fft_shaped_noise(dur, slope=0.5, low_cut=800.0, high_cut=5000.0, seed=603) * 0.10

    # Sharp wood crackles & pops
    crackles = np.zeros((n, 2))
    for _ in range(220):
        pos = rng.integers(0, n - 1200)
        length = rng.integers(60, 420)
        decay = rng.uniform(8.0, 22.0)
        env = np.exp(-np.linspace(0, decay, length))
        burst = rng.standard_normal(length) * env
        # High-pass-ish click by differencing
        burst = np.diff(burst, prepend=0.0)
        amp = rng.uniform(0.08, 0.45) * (1.8 if rng.random() < 0.12 else 1.0)
        pan = rng.uniform(0.2, 0.8)
        crackles[pos:pos + length, 0] += burst * amp * (1.0 - pan)
        crackles[pos:pos + length, 1] += burst * amp * pan

    audio = ember * 0.9 + hiss + crackles * 0.55
    return normalize_stereo(audio, 0.84)


def make_wind() -> np.ndarray:
    dur = 24.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    base = fft_shaped_noise(dur, slope=0.85, low_cut=40.0, high_cut=2400.0, seed=701)
    # Two drifting resonant bands that cross-swell smoothly
    band_low = bandpass_fft(base, center=240.0, q=1.8)
    band_mid = bandpass_fft(base, center=480.0, q=2.2)

    # Exact integer cycles over 24s for seamless loop
    g1 = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * (2.0 / dur) * t)) ** 1.5
    g2 = 0.20 + 0.80 * (0.5 + 0.5 * np.sin(2 * np.pi * (3.0 / dur) * t + 1.2)) ** 2.0

    audio = base * 0.25 + band_low * g1[:, None] * 0.85 + band_mid * g2[:, None] * 0.55
    return normalize_stereo(audio, 0.80)


def make_crickets() -> np.ndarray:
    dur = 16.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    # Very gentle night air ambience
    air = fft_shaped_noise(dur, slope=0.9, low_cut=50.0, high_cut=900.0, seed=801) * 0.08
    audio = air.copy()

    # 3 crickets at slightly different frequencies, rhythms, and stereo positions
    crickets = [
        (4150.0, 1.0, 0.0, 0.25, 0.55),   # left-ish, 1 chirp/sec
        (4380.0, 0.75, 0.35, 0.78, 0.42), # right-ish, 0.75 chirp/sec
        (3920.0, 0.5, 0.70, 0.50, 0.28),  # distant center, 0.5 chirp/sec
    ]
    for freq, rate, offset, pan, gain in crickets:
        period = 1.0 / rate
        local_t = (t + offset) % period
        # 4 quick pulses within the first 0.26s of each chirp cycle
        chirp_env = np.zeros(n)
        for p in range(4):
            p_start = p * 0.055
            p_len = 0.036
            mask = (local_t >= p_start) & (local_t < p_start + p_len)
            u = (local_t[mask] - p_start) / p_len
            chirp_env[mask] = np.sin(np.pi * u) ** 1.5
        carrier = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * (freq * 2.0) * t)
        sig = carrier * chirp_env * gain * 0.35
        audio[:, 0] += sig * (1.0 - pan)
        audio[:, 1] += sig * pan

    return normalize_stereo(audio, 0.72)


def save_ogg(name: str, stereo: np.ndarray) -> None:
    pcm = (np.clip(stereo, -1.0, 1.0) * 32767.0).astype(np.int16)
    out_ogg = os.path.join(OUT_DIR, f"{name}.ogg")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
    try:
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-c:a", "libvorbis", "-q:a", "5", out_ogg],
            check=True,
        )
        size_kb = os.path.getsize(out_ogg) / 1024.0
        print(f"Generated {name}.ogg ({size_kb:.1f} KB)")
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)


if __name__ == "__main__":
    generators = {
        "brown_noise": make_brown_noise,
        "box_fan": make_box_fan,
        "rain": make_rain,
        "thunder": make_thunder,
        "ocean": make_ocean,
        "campfire": make_campfire,
        "wind": make_wind,
        "crickets": make_crickets,
    }
    for name, fn in generators.items():
        audio = fn()
        save_ogg(name, audio)
    print("All 8 ambient sound loops generated successfully.")
