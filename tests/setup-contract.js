'use strict'

const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { createReadStream, existsSync } = require('node:fs')

const expectedEntries = [
  'tlc2/TLC.class',
  'tlc2/tool/ModelChecker.class',
  'tlc2/tool/distributed/TLCServer.class'
]

async function main() {
  const jarPath = required('ACTION_JAR_PATH')
  const version = required('EXPECTED_VERSION')
  const sha256 = required('EXPECTED_SHA256')

  assert.equal(required('ACTION_VERSION'), version)
  assert.equal(required('ACTION_SHA256'), sha256)
  assert.equal(required('TLA2TOOLS_JAR'), jarPath)
  assert.equal(required('CLASSPATH'), 'setup-contract-sentinel')
  assert.equal(
    required('ACTION_JAVA_COMMAND'),
    `java -cp "${jarPath}" tlc2.TLC`
  )
  assert.ok(existsSync(jarPath), `Expected JAR at ${jarPath}`)
  assert.equal(await sha256File(jarPath), sha256)

  const entries = new Set(run('jar', ['tf', jarPath]).split(/\r?\n/u))
  for (const entry of expectedEntries) assert.ok(entries.has(entry), `Missing ${entry}`)

  const help = run('java', ['-cp', jarPath, 'tlc2.TLC', '-h'], [0, 1])
  assert.match(help, new RegExp(`Version ${escapeRegex(version)}`, 'u'))
  process.stdout.write(`Verified TLA+ tools ${version} on ${process.platform}\n`)
}

function required(name) {
  const value = process.env[name]
  assert.ok(value, `${name} must be set`)
  return value
}

async function sha256File(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

function run(command, args, acceptedStatuses = [0]) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true })
  if (result.error) throw result.error
  assert.ok(
    acceptedStatuses.includes(result.status),
    `${command} exited with status ${result.status}: ${result.stderr}`
  )
  return `${result.stdout || ''}${result.stderr || ''}`
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`)
  process.exitCode = 1
})
