import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import * as path from 'node:path'
import { Readable, Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export const MAX_JAR_BYTES = 64 * 1024 * 1024

export async function download(
  url: string,
  destination: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = `${destination}.${randomUUID()}.tmp`

  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': 'zactionsz/tla-tools' },
      redirect: 'follow'
    })
    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status} for ${url}`)
    }
    if (!response.body) {
      throw new Error(`Download returned an empty response body for ${url}`)
    }

    const declaredLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_JAR_BYTES) {
      throw new Error(`Download exceeds the ${MAX_JAR_BYTES}-byte safety limit`)
    }

    let received = 0
    const limit = new Transform({
      transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: TransformCallback
      ): void {
        received += chunk.length
        if (received > MAX_JAR_BYTES) {
          callback(new Error(`Download exceeds the ${MAX_JAR_BYTES}-byte safety limit`))
          return
        }
        callback(null, chunk)
      }
    })

    await pipeline(
      Readable.from(response.body),
      limit,
      createWriteStream(temporary, { flags: 'wx' })
    )
    await rename(temporary, destination)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}
