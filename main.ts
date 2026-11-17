// Palmera Bay — the hand-in program (Node 22, standard library only).
//
// It takes the game in this repository — the static files under game/ and the
// screenshots under screenshots/ — copies them to the output directory and
// writes the dossier the judge reads, built by the vendored make.fun library.
// The grader runs it twice and both runs must write the same bytes, so nothing
// here depends on the clock, the network or the order the filesystem returns.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, from the kit's reference/gate.json. An entry that
// breaks them here would break them in the scorer too, so refuse early with a
// clear message instead of handing in something invalid.
const CAPS = {
  textMaxBytes: 163840,
  screenshotsMax: 4,
  screenshotMaxBytes: 262144,
  gameMaxFiles: 993,
  gameMaxBytes: 50331648,
  gamePathMaxBytes: 1000,
};

function countTree(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      const sub = countTree(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (st.isFile()) {
      files += 1;
      bytes += st.size;
      if (Buffer.byteLength(path, 'utf8') > CAPS.gamePathMaxBytes) {
        throw new Error(`path too long for the gate: ${path}`);
      }
    }
  }
  return { files, bytes };
}

function checkGameTree(): { files: number; bytes: number } {
  const gameDir = join(repoRoot, 'game');
  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error('game/index.html is missing');
  }
  const totals = countTree(gameDir);
  if (totals.files > CAPS.gameMaxFiles) {
    throw new Error(`game/ holds ${totals.files} files, over the ${CAPS.gameMaxFiles} cap`);
  }
  if (totals.bytes > CAPS.gameMaxBytes) {
    throw new Error(`game/ is ${totals.bytes} bytes, over the ${CAPS.gameMaxBytes} cap`);
  }
  return totals;
}

function checkShots(): string[] {
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
  if (shots.length < 3 || shots.length > CAPS.screenshotsMax) {
    throw new Error(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > CAPS.screenshotMaxBytes) {
      throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
    }
  }
  return shots;
}

function handIn(): void {
  const gameTotals = checkGameTree();
  const shots = checkShots();
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  writeFileSync(
    join(outputDir, 'dossier.json'),
    buildDossier(outputDir, {
      text_max_bytes: CAPS.textMaxBytes,
      screenshots: { max: CAPS.screenshotsMax, max_bytes: CAPS.screenshotMaxBytes },
      game_max_files: CAPS.gameMaxFiles,
      game_max_bytes: CAPS.gameMaxBytes,
      game_path_max_bytes: CAPS.gamePathMaxBytes,
    }),
  );
  console.log(`Palmera Bay handed in: ${outputDir}`);
  console.log(`game/: ${gameTotals.files} files, ${gameTotals.bytes} bytes`);
  console.log(`screenshots: ${shots.join(', ')}`);
}

handIn();
