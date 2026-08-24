'use strict'

const assert = require('node:assert/strict')
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const { exportVariable, input, setOutput } = require('../src/github')

test('reads required inputs and writes only explicit command-file values', async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tla-tools-github-'))
  context.after(() => rm(directory, { force: true, recursive: true }))
  const output = path.join(directory, 'output')
  const environmentFile = path.join(directory, 'environment')
  await Promise.all([writeFile(output, ''), writeFile(environmentFile, '')])
  const environment = {
    GITHUB_ENV: environmentFile,
    GITHUB_OUTPUT: output,
    INPUT_SHA256: 'abc'
  }

  assert.equal(input('sha256', environment), 'abc')
  setOutput('version', '1', environment)
  exportVariable('TLA2TOOLS_JAR', '/tmp/tla2tools.jar', environment)

  assert.match(await readFile(output, 'utf8'), /^version=1\r?\n$/u)
  assert.match(
    await readFile(environmentFile, 'utf8'),
    /^TLA2TOOLS_JAR=\/tmp\/tla2tools\.jar\r?\n$/u
  )
  assert.doesNotMatch(await readFile(environmentFile, 'utf8'), /CLASSPATH/u)
})
