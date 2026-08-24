'use strict'

const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { createReadStream } = require('node:fs')

async function sha256File(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

function verifyJarEntries(jarPath, expectedEntries) {
  const result = run('jar', ['tf', jarPath])
  const entries = new Set(result.output.split(/\r?\n/u))
  const missing = expectedEntries.filter((entry) => !entries.has(entry))
  if (missing.length > 0) {
    throw new Error(`JAR is missing expected TLC entries: ${missing.join(', ')}`)
  }
}

function verifyBuildIdentity(jarPath, version) {
  // TLC currently returns 1 after printing valid help, so identity is the
  // success signal for this probe rather than the help command's exit code.
  const result = run('java', ['-cp', jarPath, 'tlc2.TLC', '-h'], [0, 1])
  const expected = `Version ${version}`
  if (!result.output.includes(expected)) {
    throw new Error(`TLC did not report the expected build identity ${expected}`)
  }
}

function run(command, args, acceptedStatuses = [0]) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true
  })
  if (result.error) {
    throw new Error(`Unable to run ${command}: ${result.error.message}`)
  }
  const output = `${result.stdout || ''}${result.stderr || ''}`
  if (!acceptedStatuses.includes(result.status)) {
    throw new Error(`${command} exited with status ${result.status}: ${output.trim()}`)
  }
  return { output }
}

module.exports = { sha256File, verifyBuildIdentity, verifyJarEntries }
