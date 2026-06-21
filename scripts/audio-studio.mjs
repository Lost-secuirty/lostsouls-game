// =====================================================================
// audio-studio.mjs — dev audio harness for the music layer (ADR-0024 / docs/AUDIO.md).
//
//   node scripts/audio-studio.mjs report    -> LUFS/peak/duration table + waveform PNGs
//                                              (artifacts/audio/) for every public/audio track
//   node scripts/audio-studio.mjs process   -> loudness-normalize (EBU R128, -16 LUFS) +
//                                              transcode each MP3 -> OGG in public/audio/
//
// ffmpeg/ffprobe are resolved from $FFMPEG/$FFPROBE, else PATH, else the winget install.
// Dev-only tooling; outputs go to the gitignored artifacts/ dir (report) or public/audio (process).
// =====================================================================

import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const AUDIO_DIR = 'public/audio';
const OUT_DIR = 'artifacts/audio';
const TARGET_LUFS = -16;
const TARGET_TP = -1.5;
const TARGET_LRA = 11;

// --- locate ffmpeg / ffprobe ---
function resolveBin(name, envVar) {
  if (process.env[envVar] && existsSync(process.env[envVar])) return process.env[envVar];
  // winget (Gyan) install location
  const wg = join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages');
  try {
    for (const dir of readdirSync(wg)) {
      if (!/Gyan\.FFmpeg/i.test(dir)) continue;
      const base = join(wg, dir);
      for (const sub of readdirSync(base)) {
        const cand = join(base, sub, 'bin', `${name}.exe`);
        if (existsSync(cand)) return cand;
      }
    }
  } catch {
    /* not on windows / not installed there */
  }
  return name; // fall back to PATH
}
const FFMPEG = resolveBin('ffmpeg', 'FFMPEG');
const FFPROBE = resolveBin('ffprobe', 'FFPROBE');

// run an action (throws on failure)
const run = (bin, args) =>
  execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// capture combined stdout+stderr regardless of exit code (ffmpeg writes summaries to stderr)
const cap = (bin, args) => {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return (r.stderr || '') + (r.stdout || '');
};

const listTracks = () =>
  readdirSync(AUDIO_DIR)
    .filter((f) => /\.(mp3|ogg|wav|m4a|opus)$/i.test(f))
    .sort();

function probe(file) {
  const p = join(AUDIO_DIR, file);
  // duration via ffprobe
  const dur = parseFloat(
    run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).trim(),
  );
  // integrated LUFS + true peak via the ebur128 filter (summary printed to stderr)
  let lufs = NaN,
    peak = NaN;
  const out = cap(FFMPEG, ['-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const mi = out.match(/I:\s*(-?[\d.]+)\s*LUFS/g);
  const tp = out.match(/Peak:\s*(-?[\d.]+)\s*dBFS/g);
  if (mi) lufs = parseFloat(mi[mi.length - 1].match(/(-?[\d.]+)/)[1]);
  if (tp) peak = parseFloat(tp[tp.length - 1].match(/(-?[\d.]+)/)[1]);
  return { file, dur, lufs, peak, kb: Math.round(statSync(p).size / 1024) };
}

function waveform(file) {
  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, basename(file, extname(file)) + '.png');
  run(FFMPEG, [
    '-y',
    '-i',
    join(AUDIO_DIR, file),
    '-filter_complex',
    'showwavespic=s=900x160:colors=#b06cff',
    '-frames:v',
    '1',
    out,
  ]);
  return out;
}

function report() {
  const tracks = listTracks();
  console.log(`\nAudio QA — ${tracks.length} tracks (target ${TARGET_LUFS} LUFS)\n`);
  console.log('  file                       dur     LUFS     peak     size');
  console.log('  ' + '-'.repeat(62));
  for (const f of tracks) {
    const r = probe(f);
    const flag =
      Number.isFinite(r.lufs) && Math.abs(r.lufs - TARGET_LUFS) > 3 ? '  ⚠ loud/quiet' : '';
    console.log(
      `  ${f.padEnd(26)} ${r.dur.toFixed(1).padStart(5)}s ${String(r.lufs).padStart(7)} ${String(r.peak).padStart(7)} ${String(r.kb).padStart(6)}KB${flag}`,
    );
    waveform(f);
  }
  console.log(`\n  waveforms -> ${OUT_DIR}/*.png\n`);
}

function process_() {
  const mp3s = listTracks().filter((f) => /\.mp3$/i.test(f));
  console.log(`\nNormalizing + transcoding ${mp3s.length} MP3 -> OGG (@ ${TARGET_LUFS} LUFS)\n`);
  for (const f of mp3s) {
    const src = join(AUDIO_DIR, f);
    const out = join(AUDIO_DIR, basename(f, '.mp3') + '.ogg');
    // pass 1 — measure (loudnorm prints its JSON to stderr; ffmpeg exits 0)
    let measured = {};
    const meas = cap(FFMPEG, [
      '-i',
      src,
      '-af',
      `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`,
      '-f',
      'null',
      '-',
    ]);
    const m = meas.match(/\{[\s\S]*\}/);
    if (m) measured = JSON.parse(m[0]);
    // pass 2 — apply linear normalization + encode to OGG (libvorbis q5 ~ 160kbps)
    const ln =
      `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:measured_I=${measured.input_i}` +
      `:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}` +
      `:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
    run(FFMPEG, ['-y', '-i', src, '-af', ln, '-c:a', 'libvorbis', '-q:a', '5', out]);
    const before = Math.round(statSync(src).size / 1024);
    const after = Math.round(statSync(out).size / 1024);
    console.log(`  ${f} -> ${basename(out)}   ${before}KB -> ${after}KB`);
  }
  console.log(
    '\n  done. Update config.MUSIC.tracks to the .ogg filenames, then delete the .mp3s.\n',
  );
}

const cmd = process.argv[2] || 'report';
console.log(`ffmpeg: ${FFMPEG}`);
if (cmd === 'report') report();
else if (cmd === 'process') process_();
else console.log('usage: node scripts/audio-studio.mjs [report|process]');
