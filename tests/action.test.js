'use strict'

const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { mkdir, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const { runAction } = require('../dist/action')
const { installPath } = require('../dist/contracts')

const VERSION = '2026.08.11.125311'

test('keeps a stale cache entry until a staged download is verified', async (context) => {
  const fixture = await createFixture(context, 'verified bytes')
  await writeFile(fixture.jarPath, 'stale bytes')

  const result = await runAction(fixture.environment, {
    download: async (_url, stagingPath) => {
      assert.equal(await readFile(fixture.jarPath, 'utf8'), 'stale bytes')
      await mkdir(path.dirname(stagingPath), { recursive: true })
      await writeFile(stagingPath, 'verified bytes')
    },
    verifyBuildIdentity: (candidate, version) => {
      assert.notEqual(candidate, fixture.jarPath)
      assert.equal(version, VERSION)
    },
    verifyJarEntries: (candidate) => assert.notEqual(candidate, fixture.jarPath)
  })

  assert.equal(result.jarPath, fixture.jarPath)
  assert.equal(await readFile(fixture.jarPath, 'utf8'), 'verified bytes')
  assert.match(await readFile(fixture.outputFile, 'utf8'), /version=2026\.08\.11\.125311/u)
  assert.doesNotMatch(await readFile(fixture.environmentFile, 'utf8'), /CLASSPATH/u)
})

test('preserves a cache entry when the staged download has the wrong digest', async (context) => {
  const fixture = await createFixture(context, 'expected bytes')
  await writeFile(fixture.jarPath, 'existing bytes')

  await assert.rejects(
    runAction(fixture.environment, {
      download: async (_url, stagingPath) => {
        assert.equal(await readFile(fixture.jarPath, 'utf8'), 'existing bytes')
        await mkdir(path.dirname(stagingPath), { recursive: true })
        await writeFile(stagingPath, 'wrong bytes')
      },
      verifyBuildIdentity: () => assert.fail('identity verification should not run'),
      verifyJarEntries: () => assert.fail('JAR verification should not run')
    }),
    /SHA-256 mismatch/u
  )

  assert.equal(await readFile(fixture.jarPath, 'utf8'), 'existing bytes')
  assert.equal(await readFile(fixture.outputFile, 'utf8'), '')
  assert.equal(await readFile(fixture.environmentFile, 'utf8'), '')
})

async function createFixture(context, expectedContents) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tla-tools-action-'))
  context.after(() => rm(root, { force: true, recursive: true }))
  const sha256 = createHash('sha256').update(expectedContents).digest('hex')
  const toolCache = path.join(root, 'cache')
  const jarPath = installPath(toolCache, VERSION, sha256)
  const outputFile = path.join(root, 'output')
  const environmentFile = path.join(root, 'environment')
  await mkdir(path.dirname(jarPath), { recursive: true })
  await Promise.all([writeFile(outputFile, ''), writeFile(environmentFile, '')])

  return {
    environment: {
      GITHUB_ENV: environmentFile,
      GITHUB_OUTPUT: outputFile,
      INPUT_SHA256: sha256,
      INPUT_VERSION: VERSION,
      RUNNER_TEMP: path.join(root, 'temp'),
      RUNNER_TOOL_CACHE: toolCache
    },
    environmentFile,
    jarPath,
    outputFile
  }
}
