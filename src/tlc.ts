import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

export async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

export function verifyJarEntries(jarPath: string, expectedEntries: readonly string[]): void {
  const result = run('jar', ['tf', jarPath])
  const entries = new Set(result.output.split(/\r?\n/u))
  const missing = expectedEntries.filter((entry) => !entries.has(entry))
  if (missing.length > 0) {
    throw new Error(`JAR is missing expected TLC entries: ${missing.join(', ')}`)
  }
}

export function verifyBuildIdentity(jarPath: string, version: string): void {
  // TLC currently returns 1 after printing valid help, so identity is the
  // success signal for this probe rather than the help command's exit code.
  const result = run('java', ['-cp', jarPath, 'tlc2.TLC', '-h'], [0, 1])
  const expected = `Version ${version}`
  if (!result.output.includes(expected)) {
    throw new Error(`TLC did not report the expected build identity ${expected}`)
  }
}

function run(
  command: string,
  args: string[],
  acceptedStatuses: readonly number[] = [0]
): { output: string } {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true
  })
  if (result.error) {
    throw new Error(`Unable to run ${command}: ${result.error.message}`)
  }
  const output = `${result.stdout || ''}${result.stderr || ''}`
  if (result.status === null || !acceptedStatuses.includes(result.status)) {
    throw new Error(`${command} exited with status ${result.status}: ${output.trim()}`)
  }
  return { output }
}
