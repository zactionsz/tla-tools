import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { access, copyFile, mkdir, rename, rm } from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  EXPECTED_JAR_ENTRIES,
  installPath,
  javaCommand,
  releaseUrl,
  requireSha256,
  requireVersion
} from './contracts'
import { download } from './download'
import * as github from './github'
import { sha256File, verifyBuildIdentity, verifyJarEntries } from './tlc'

interface Dependencies {
  download: typeof download
  sha256File: typeof sha256File
  verifyBuildIdentity: typeof verifyBuildIdentity
  verifyJarEntries: typeof verifyJarEntries
}

export interface ActionResult {
  jarPath: string
  sha256: string
  version: string
}

export async function runAction(
  environment: NodeJS.ProcessEnv = process.env,
  overrides: Partial<Dependencies> = {}
): Promise<ActionResult> {
  const dependencies: Dependencies = {
    download,
    sha256File,
    verifyBuildIdentity,
    verifyJarEntries,
    ...overrides
  }
  const version = requireVersion(github.input('version', environment))
  const expectedSha256 = requireSha256(github.input('sha256', environment))
  const toolCache = environment.RUNNER_TOOL_CACHE || environment.RUNNER_TEMP || os.tmpdir()
  const runnerTemp = environment.RUNNER_TEMP || os.tmpdir()
  const jarPath = installPath(toolCache, version, expectedSha256)
  const url = releaseUrl(version)

  const cachedSha256 = await digestIfPresent(jarPath, dependencies.sha256File)
  let actualSha256: string
  if (cachedSha256 === expectedSha256) {
    actualSha256 = cachedSha256
    github.info(`Using verified cached TLA+ tools ${version}`)
    verifyTlc(jarPath, version, dependencies)
  } else {
    const stagingPath = path.resolve(
      runnerTemp,
      'tla-tools-staging',
      `${version}-${randomUUID()}.jar`
    )
    try {
      github.info(`Downloading immutable release ${url}`)
      await dependencies.download(url, stagingPath)
      actualSha256 = await dependencies.sha256File(stagingPath)
      if (actualSha256 !== expectedSha256) {
        throw new Error(
          `SHA-256 mismatch for tla2tools.jar: expected ${expectedSha256}, ` +
            `received ${actualSha256}`
        )
      }
      verifyTlc(stagingPath, version, dependencies)
      await publishVerified(stagingPath, jarPath, expectedSha256, dependencies.sha256File)
    } finally {
      await rm(stagingPath, { force: true })
    }
  }

  github.exportVariable('TLA2TOOLS_JAR', jarPath, environment)
  github.setOutput('version', version, environment)
  github.setOutput('jar-path', jarPath, environment)
  github.setOutput('sha256', actualSha256, environment)
  github.setOutput('java-command', javaCommand(jarPath), environment)
  github.info(`Installed and verified TLA+ tools ${version}`)

  return { jarPath, sha256: actualSha256, version }
}

function verifyTlc(jarPath: string, version: string, dependencies: Dependencies): void {
  dependencies.verifyJarEntries(jarPath, EXPECTED_JAR_ENTRIES)
  dependencies.verifyBuildIdentity(jarPath, version)
}

type DigestFile = (file: string) => Promise<string>

export async function publishVerified(
  source: string,
  destination: string,
  expectedSha256: string,
  digestFile: DigestFile
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  const cacheStagingPath = `${destination}.${randomUUID()}.tmp`
  try {
    await copyFile(source, cacheStagingPath, constants.COPYFILE_EXCL)
    const copiedDigest = await digestFile(cacheStagingPath)
    if (copiedDigest !== expectedSha256) {
      throw new Error(
        `SHA-256 mismatch while staging the verified cache entry: expected ` +
          `${expectedSha256}, received ${copiedDigest}`
      )
    }

    try {
      await rename(cacheStagingPath, destination)
      return
    } catch (error) {
      if (
        !isNodeError(error) ||
        !['EACCES', 'EEXIST', 'ENOTEMPTY', 'EPERM'].includes(error.code ?? '')
      ) {
        throw error
      }
    }

    const existingDigest = await digestIfPresent(destination, digestFile)
    if (existingDigest === expectedSha256) return

    // Windows cannot atomically replace an existing file with rename. At this
    // point the same-volume replacement has passed every verification gate.
    await rm(destination, { force: true })
    await rename(cacheStagingPath, destination)
  } finally {
    await rm(cacheStagingPath, { force: true })
  }
}

async function digestIfPresent(
  file: string,
  digestFile: DigestFile
): Promise<string | undefined> {
  try {
    await access(file)
    return await digestFile(file)
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined
    throw error
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}
