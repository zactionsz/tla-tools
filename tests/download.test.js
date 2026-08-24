'use strict'

const assert = require('node:assert/strict')
const { mkdtemp, readFile, rm } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const { download } = require('../dist/download')

test('downloads bytes atomically', async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tla-tools-download-'))
  context.after(() => rm(directory, { force: true, recursive: true }))
  const destination = path.join(directory, 'nested', 'tla2tools.jar')
  const response = new Response('verified bytes', {
    headers: { 'content-length': '14' },
    status: 200
  })

  await download('https://example.invalid/tla2tools.jar', destination, async () => response)

  assert.equal(await readFile(destination, 'utf8'), 'verified bytes')
})

test('does not leave a partial file after a failed download', async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tla-tools-download-'))
  context.after(() => rm(directory, { force: true, recursive: true }))
  const destination = path.join(directory, 'tla2tools.jar')

  await assert.rejects(
    download(
      'https://example.invalid/tla2tools.jar',
      destination,
      async () => new Response('missing', { status: 404 })
    ),
    /HTTP 404/u
  )
  await assert.rejects(readFile(destination), /ENOENT/u)
})
