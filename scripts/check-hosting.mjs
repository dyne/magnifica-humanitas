import { spawnSync } from 'node:child_process'
for (const base of ['/', '/magnifica-humanitas/']) {
  const env = { ...process.env, VITE_BASE: base }
  for (const args of [['run', 'build'], ['run', 'test:browser']]) {
    const result = spawnSync('npm', args, { env, stdio: 'inherit' })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
}
