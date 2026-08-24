'use strict'

const { appendFileSync } = require('node:fs')
const { EOL } = require('node:os')

function input(name, environment = process.env) {
  const value = environment[`INPUT_${name.replaceAll('-', '_').toUpperCase()}`]
  if (!value || !value.trim()) throw new Error(`Input ${name} is required`)
  return value
}

function setOutput(name, value, environment = process.env) {
  appendCommand(environment.GITHUB_OUTPUT, name, value, 'output')
}

function exportVariable(name, value, environment = process.env) {
  appendCommand(environment.GITHUB_ENV, name, value, 'environment')
}

function appendCommand(file, name, value, kind) {
  if (!file) throw new Error(`GITHUB_${kind === 'output' ? 'OUTPUT' : 'ENV'} is not set`)
  const rendered = String(value)
  if (/[\r\n]/u.test(name) || /[\r\n]/u.test(rendered)) {
    throw new Error(`Cannot write multiline ${kind} values`)
  }
  appendFileSync(file, `${name}=${rendered}${EOL}`, { encoding: 'utf8' })
}

function info(message) {
  process.stdout.write(`${message}${EOL}`)
}

function setFailed(error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`::error::${escapeWorkflowCommand(message)}${EOL}`)
  process.exitCode = 1
}

function escapeWorkflowCommand(message) {
  return message
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A')
}

module.exports = { exportVariable, info, input, setFailed, setOutput }
