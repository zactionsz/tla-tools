import { appendFileSync } from 'node:fs'
import { EOL } from 'node:os'

export function input(name: string, environment: NodeJS.ProcessEnv = process.env): string {
  const value = environment[`INPUT_${name.replaceAll('-', '_').toUpperCase()}`]
  if (!value || !value.trim()) throw new Error(`Input ${name} is required`)
  return value
}

export function setOutput(
  name: string,
  value: unknown,
  environment: NodeJS.ProcessEnv = process.env
): void {
  appendCommand(environment.GITHUB_OUTPUT, name, value, 'output')
}

export function exportVariable(
  name: string,
  value: unknown,
  environment: NodeJS.ProcessEnv = process.env
): void {
  appendCommand(environment.GITHUB_ENV, name, value, 'environment')
}

function appendCommand(
  file: string | undefined,
  name: string,
  value: unknown,
  kind: 'environment' | 'output'
): void {
  if (!file) throw new Error(`GITHUB_${kind === 'output' ? 'OUTPUT' : 'ENV'} is not set`)
  const rendered = String(value)
  if (/[\r\n]/u.test(name) || /[\r\n]/u.test(rendered)) {
    throw new Error(`Cannot write multiline ${kind} values`)
  }
  appendFileSync(file, `${name}=${rendered}${EOL}`, { encoding: 'utf8' })
}

export function info(message: string): void {
  process.stdout.write(`${message}${EOL}`)
}

export function setFailed(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`::error::${escapeWorkflowCommand(message)}${EOL}`)
  process.exitCode = 1
}

function escapeWorkflowCommand(message: string): string {
  return message
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A')
}
