'use strict'

const path = require('node:path')

const RELEASE_BASE_URL = 'https://github.com/zactionsz/tla-tools/releases/download'
const VERSION_PATTERN = /^\d{4}\.\d{2}\.\d{2}\.\d{6}$/
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/
const EXPECTED_JAR_ENTRIES = Object.freeze([
  'tlc2/TLC.class',
  'tlc2/tool/ModelChecker.class',
  'tlc2/tool/distributed/TLCServer.class'
])

function requireVersion(value) {
  const version = value.trim()
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(
      `Invalid version ${JSON.stringify(value)}; expected YYYY.MM.DD.HHMMSS`
    )
  }
  return version
}

function requireSha256(value) {
  const sha256 = value.trim()
  if (!SHA256_PATTERN.test(sha256)) {
    throw new Error('Invalid sha256; expected exactly 64 hexadecimal characters')
  }
  return sha256.toLowerCase()
}

function releaseUrl(version) {
  return `${RELEASE_BASE_URL}/tla2tools-${version}/tla2tools.jar`
}

function installPath(toolCache, version, architecture = process.arch) {
  return path.resolve(toolCache, 'tla-tools', version, architecture, 'tla2tools.jar')
}

function javaCommand(jarPath, platform = process.platform) {
  return `java -cp ${quoteArgument(jarPath, platform)} tlc2.TLC`
}

function quoteArgument(value, platform) {
  if (/[\r\n]/u.test(value)) {
    throw new Error('Command arguments cannot contain newlines')
  }
  if (platform === 'win32') {
    return `"${value.replaceAll('"', '""')}"`
  }
  return `"${value.replace(/["\\$`]/gu, '\\$&')}"`
}

module.exports = {
  EXPECTED_JAR_ENTRIES,
  installPath,
  javaCommand,
  releaseUrl,
  requireSha256,
  requireVersion
}
