# Raw Sound Recordings

Drop your raw CC0 / self-recorded audio files here using these exact base filenames (any format: `.wav`, `.flac`, `.mp3`, `.m4a`, `.ogg`):

- `rain.*` — Heavy Rain
- `thunder.*` — Distant Thunder
- `ocean.*` — Ocean Waves
- `brown_noise.*` — Brown Noise
- `box_fan.*` — Box Fan
- `campfire.*` — Campfire
- `wind.*` — Night Wind
- `crickets.*` — Crickets

Then run:

```powershell
python scripts/process-sounds.py
```

Or process specific sounds only:

```powershell
python scripts/process-sounds.py rain campfire
```

The script automatically:
1. Trims a clean ~45s section from the middle of your recording.
2. Applies a 4-second equal-power crossfade so the loop seam is seamless.
3. Normalizes perceived loudness to `-16 LUFS`.
4. Exports gapless stereo `.ogg` files into `assets/sounds/`.

*(Raw audio files in this folder are gitignored so large source files don't bloat the repository.)*
