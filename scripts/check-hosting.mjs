import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, copyFileSync, readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const destination = process.env.BROWSER_EVIDENCE_DIR ?? 'output/hosting'
mkdirSync(destination, { recursive: true })
const runs = []
for (const base of ['/', '/magnifica-humanitas/']) {
  const kind = base === '/' ? 'root' : 'subpath'
  const env = { ...process.env, VITE_BASE: base }
  const run = { base, startedAt: new Date().toISOString(), commands: [], hashes: {} }
  runs.push(run)
  for (const args of [['run', 'build'], ['run', 'test:browser']]) {
    const result = spawnSync('npm', args, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
    const phase = args[1] === 'build' ? 'build' : 'browser'
    const log = join(destination, `${kind}-${phase}.log`)
    writeFileSync(log, `${result.stdout ?? ''}\n${result.stderr ?? ''}`)
    run.commands.push({ command: `VITE_BASE=${base} npm ${args.join(' ')}`, exitStatus: result.status, log })
    if (phase === 'browser') copyFileSync('output/browser-results.json', join(destination, `${kind}-browser-results.json`))
    if (phase === 'build') for (const name of readdirSync('dist/assets').filter(name => name.endsWith('.js'))) run.hashes[`dist/assets/${name}`] = createHash('sha256').update(readFileSync(`dist/assets/${name}`)).digest('hex')
    run.finishedAt = new Date().toISOString()
    writeFileSync(join(destination, 'browser-evidence.json'), JSON.stringify({ runs }, null, 2))
    console.log(`${kind} ${phase}: ${result.status === 0 ? 'PASS' : 'FAIL'} (${log})`)
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
}
