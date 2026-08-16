/**
 * Publish dist/ to the gh-pages branch.
 *
 *   npm run deploy
 *
 * Uses a throwaway repo inside dist/ and force-pushes to gh-pages, so the
 * published branch holds exactly the current build with no history to prune.
 * Source history on main is untouched.
 *
 * A GitHub Actions workflow would be the more conventional choice, but the
 * available token lacks the `workflow` scope, so pushing .github/workflows/
 * would be rejected. This achieves the same result with `repo` alone.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BRANCH = 'gh-pages';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('deploy: dist/index.html missing — run `npm run build` first');
  process.exit(1);
}
if (!existsSync(join(DIST, '404.html'))) {
  console.error('deploy: dist/404.html missing — deep links would 404 on Pages');
  process.exit(1);
}

const git = (args, cwd = DIST) =>
  execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT })
  .toString()
  .trim();

console.log(`deploy: publishing dist/ to ${BRANCH} on ${remote}`);

// Fresh throwaway repo each time — no stale history, no accidental carry-over.
rmSync(join(DIST, '.git'), { recursive: true, force: true });

git(['init', '-b', BRANCH]);
git(['add', '-A']);
git(['-c', 'user.name=deploy', '-c', 'user.email=deploy@local', 'commit', '-q', '-m', 'Deploy']);
git(['push', '--force', '--quiet', remote, `${BRANCH}:${BRANCH}`]);

rmSync(join(DIST, '.git'), { recursive: true, force: true });

console.log(`deploy: pushed. Pages will rebuild in ~1 minute.`);
