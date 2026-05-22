/**
 * autopush.mjs
 * Watches the ev project for file changes and auto-commits + pushes to GitHub.
 * Run with: node autopush.mjs
 */

import { watch } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve('.');
const DEBOUNCE_MS = 3000; // wait 3s after last change before pushing

const WATCH_DIRS = [
  'client/src',
  'admin/src',
  'server',
  'src',
];

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  '.env',
];

let timer = null;
let pendingChanges = new Set();

function shouldIgnore(path) {
  return IGNORE_PATTERNS.some(p => path.includes(p));
}

function autoPush() {
  if (pendingChanges.size === 0) return;

  const files = [...pendingChanges].join(', ');
  pendingChanges.clear();

  try {
    console.log(`\n[autopush] Changes detected in: ${files}`);
    const status = execSync('git status --short', { cwd: ROOT }).toString().trim();
    if (!status) {
      console.log('[autopush] No staged changes — skipping.');
      return;
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    execSync('git add -A', { cwd: ROOT });
    execSync(`git commit -m "auto: save changes [${timestamp}]"`, { cwd: ROOT });
    execSync('git push origin main', { cwd: ROOT });
    console.log(`[autopush] ✅ Pushed to GitHub at ${timestamp}`);
  } catch (err) {
    console.error('[autopush] ❌ Push failed:', err.message);
  }
}

function scheduleCommit(filename) {
  if (shouldIgnore(filename)) return;
  pendingChanges.add(filename);
  clearTimeout(timer);
  timer = setTimeout(autoPush, DEBOUNCE_MS);
}

// Start watchers
for (const dir of WATCH_DIRS) {
  const fullPath = resolve(ROOT, dir);
  try {
    watch(fullPath, { recursive: true }, (event, filename) => {
      if (filename) scheduleCommit(`${dir}/${filename}`);
    });
    console.log(`[autopush] 👁  Watching: ${dir}`);
  } catch {
    console.warn(`[autopush] ⚠  Could not watch: ${dir} (may not exist)`);
  }
}

console.log('[autopush] 🚀 Auto-push watcher running. Press Ctrl+C to stop.\n');
