"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256File = sha256File;
exports.verifyJarEntries = verifyJarEntries;
exports.verifyBuildIdentity = verifyBuildIdentity;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
async function sha256File(file) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    for await (const chunk of (0, node_fs_1.createReadStream)(file))
        hash.update(chunk);
    return hash.digest('hex');
}
function verifyJarEntries(jarPath, expectedEntries) {
    const result = run('jar', ['tf', jarPath]);
    const entries = new Set(result.output.split(/\r?\n/u));
    const missing = expectedEntries.filter((entry) => !entries.has(entry));
    if (missing.length > 0) {
        throw new Error(`JAR is missing expected TLC entries: ${missing.join(', ')}`);
    }
}
function verifyBuildIdentity(jarPath, version) {
    // TLC currently returns 1 after printing valid help, so identity is the
    // success signal for this probe rather than the help command's exit code.
    const result = run('java', ['-cp', jarPath, 'tlc2.TLC', '-h'], [0, 1]);
    const expected = `Version ${version}`;
    if (!result.output.includes(expected)) {
        throw new Error(`TLC did not report the expected build identity ${expected}`);
    }
}
function run(command, args, acceptedStatuses = [0]) {
    const result = (0, node_child_process_1.spawnSync)(command, args, {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true
    });
    if (result.error) {
        throw new Error(`Unable to run ${command}: ${result.error.message}`);
    }
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    if (result.status === null || !acceptedStatuses.includes(result.status)) {
        throw new Error(`${command} exited with status ${result.status}: ${output.trim()}`);
    }
    return { output };
}
