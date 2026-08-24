'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const {
  installPath,
  javaCommand,
  releaseUrl,
  requireSha256,
  requireVersion
} = require('../src/contracts')

const VERSION = '2026.08.11.125311'
const SHA256 = 'AB323B79802AEDC3203B3F9AF37C6ACA3ED43F4E0225B36F2AA77B26DE46C05F'

test('normalizes the public action inputs', () => {
  assert.equal(requireVersion(` ${VERSION} `), VERSION)
  assert.equal(requireSha256(` ${SHA256} `), SHA256.toLowerCase())
})

test('rejects release paths and malformed hashes', () => {
  assert.throws(() => requireVersion('../latest'), /Invalid version/u)
  assert.throws(() => requireVersion('2026.8.11.125311'), /Invalid version/u)
  assert.throws(() => requireSha256('abc'), /64 hexadecimal/u)
})

test('builds the canonical immutable asset URL', () => {
  assert.equal(
    releaseUrl(VERSION),
    'https://github.com/zactionsz/tla-tools/releases/download/' +
      'tla2tools-2026.08.11.125311/tla2tools.jar'
  )
})

test('uses a versioned and architecture-specific tool cache path', () => {
  assert.equal(
    installPath('/cache', VERSION, 'arm64'),
    path.resolve('/cache', 'tla-tools', VERSION, 'arm64', 'tla2tools.jar')
  )
})

test('renders a shell-ready TLC command on each platform', () => {
  assert.equal(
    javaCommand('/cache with spaces/tla2tools.jar', 'linux'),
    'java -cp "/cache with spaces/tla2tools.jar" tlc2.TLC'
  )
  assert.equal(
    javaCommand('C:\\tool cache\\tla2tools.jar', 'win32'),
    'java -cp "C:\\tool cache\\tla2tools.jar" tlc2.TLC'
  )
})
