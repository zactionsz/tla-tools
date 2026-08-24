import * as path from 'node:path'

const RELEASE_BASE_URL = 'https://github.com/zactionsz/tla-tools/releases/download'
const VERSION_PATTERN = /^\d{4}\.\d{2}\.\d{2}\.\d{6}$/
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/

export const EXPECTED_JAR_ENTRIES = Object.freeze([
  'tlc2/TLC.class',
  'tlc2/tool/ModelChecker.class',
  'tlc2/tool/distributed/TLCServer.class'
])

export function requireVersion(value: string): string {
  const version = value.trim()
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(
      `Invalid version ${JSON.stringify(value)}; expected YYYY.MM.DD.HHMMSS`
    )
  }
  return version
}

export function requireSha256(value: string): string {
  const sha256 = value.trim()
  if (!SHA256_PATTERN.test(sha256)) {
    throw new Error('Invalid sha256; expected exactly 64 hexadecimal characters')
  }
  return sha256.toLowerCase()
}

export function releaseUrl(version: string): string {
  return `${RELEASE_BASE_URL}/tla2tools-${version}/tla2tools.jar`
}

export function installPath(
  toolCache: string,
  version: string,
  sha256: string,
  architecture = process.arch
): string {
  return path.resolve(
    toolCache,
    'tla-tools',
    version,
    architecture,
    sha256,
    'tla2tools.jar'
  )
}

export function javaCommand(
  jarPath: string,
  platform: NodeJS.Platform = process.platform
): string {
  return `java -cp ${quoteArgument(jarPath, platform)} tlc2.TLC`
}

function quoteArgument(value: string, platform: NodeJS.Platform): string {
  if (/[\r\n]/u.test(value)) {
    throw new Error('Command arguments cannot contain newlines')
  }
  if (platform === 'win32') {
    return `"${value.replaceAll('"', '""')}"`
  }
  return `"${value.replace(/["\\$`]/gu, '\\$&')}"`
}
