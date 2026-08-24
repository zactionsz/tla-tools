'use strict'

const { access, rm } = require('node:fs/promises')
const os = require('node:os')
const {
  EXPECTED_JAR_ENTRIES,
  installPath,
  javaCommand,
  releaseUrl,
  requireSha256,
  requireVersion
} = require('./contracts')
const { download } = require('./download')
const github = require('./github')
const { sha256File, verifyBuildIdentity, verifyJarEntries } = require('./tlc')

async function runAction(environment = process.env) {
  const version = requireVersion(github.input('version', environment))
  const expectedSha256 = requireSha256(github.input('sha256', environment))
  const toolCache = environment.RUNNER_TOOL_CACHE || environment.RUNNER_TEMP || os.tmpdir()
  const jarPath = installPath(toolCache, version)
  const url = releaseUrl(version)

  const cachedDigest = await digestIfPresent(jarPath)
  if (cachedDigest !== expectedSha256) {
    if (cachedDigest) await rm(jarPath, { force: true })
    github.info(`Downloading immutable release ${url}`)
    await download(url, jarPath)
  } else {
    github.info(`Using verified cached TLA+ tools ${version}`)
  }

  const actualSha256 = await sha256File(jarPath)
  if (actualSha256 !== expectedSha256) {
    await rm(jarPath, { force: true })
    throw new Error(
      `SHA-256 mismatch for tla2tools.jar: expected ${expectedSha256}, received ${actualSha256}`
    )
  }

  verifyJarEntries(jarPath, EXPECTED_JAR_ENTRIES)
  verifyBuildIdentity(jarPath, version)

  github.exportVariable('TLA2TOOLS_JAR', jarPath, environment)
  github.setOutput('version', version, environment)
  github.setOutput('jar-path', jarPath, environment)
  github.setOutput('sha256', actualSha256, environment)
  github.setOutput('java-command', javaCommand(jarPath), environment)
  github.info(`Installed and verified TLA+ tools ${version}`)

  return { jarPath, sha256: actualSha256, version }
}

async function digestIfPresent(file) {
  try {
    await access(file)
    return await sha256File(file)
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}

module.exports = { runAction }
