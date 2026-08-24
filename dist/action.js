"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAction = runAction;
exports.publishVerified = publishVerified;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const contracts_1 = require("./contracts");
const download_1 = require("./download");
const github = __importStar(require("./github"));
const tlc_1 = require("./tlc");
async function runAction(environment = process.env, overrides = {}) {
    const dependencies = {
        download: download_1.download,
        sha256File: tlc_1.sha256File,
        verifyBuildIdentity: tlc_1.verifyBuildIdentity,
        verifyJarEntries: tlc_1.verifyJarEntries,
        ...overrides
    };
    const version = (0, contracts_1.requireVersion)(github.input('version', environment));
    const expectedSha256 = (0, contracts_1.requireSha256)(github.input('sha256', environment));
    const toolCache = environment.RUNNER_TOOL_CACHE || environment.RUNNER_TEMP || os.tmpdir();
    const runnerTemp = environment.RUNNER_TEMP || os.tmpdir();
    const jarPath = (0, contracts_1.installPath)(toolCache, version, expectedSha256);
    const url = (0, contracts_1.releaseUrl)(version);
    const cachedSha256 = await digestIfPresent(jarPath, dependencies.sha256File);
    let actualSha256;
    if (cachedSha256 === expectedSha256) {
        actualSha256 = cachedSha256;
        github.info(`Using verified cached TLA+ tools ${version}`);
        verifyTlc(jarPath, version, dependencies);
    }
    else {
        const stagingPath = path.resolve(runnerTemp, 'tla-tools-staging', `${version}-${(0, node_crypto_1.randomUUID)()}.jar`);
        try {
            github.info(`Downloading immutable release ${url}`);
            await dependencies.download(url, stagingPath);
            actualSha256 = await dependencies.sha256File(stagingPath);
            if (actualSha256 !== expectedSha256) {
                throw new Error(`SHA-256 mismatch for tla2tools.jar: expected ${expectedSha256}, ` +
                    `received ${actualSha256}`);
            }
            verifyTlc(stagingPath, version, dependencies);
            await publishVerified(stagingPath, jarPath, expectedSha256, dependencies.sha256File);
        }
        finally {
            await (0, promises_1.rm)(stagingPath, { force: true });
        }
    }
    github.exportVariable('TLA2TOOLS_JAR', jarPath, environment);
    github.setOutput('version', version, environment);
    github.setOutput('jar-path', jarPath, environment);
    github.setOutput('sha256', actualSha256, environment);
    github.setOutput('java-command', (0, contracts_1.javaCommand)(jarPath), environment);
    github.info(`Installed and verified TLA+ tools ${version}`);
    return { jarPath, sha256: actualSha256, version };
}
function verifyTlc(jarPath, version, dependencies) {
    dependencies.verifyJarEntries(jarPath, contracts_1.EXPECTED_JAR_ENTRIES);
    dependencies.verifyBuildIdentity(jarPath, version);
}
async function publishVerified(source, destination, expectedSha256, digestFile) {
    await (0, promises_1.mkdir)(path.dirname(destination), { recursive: true });
    const cacheStagingPath = `${destination}.${(0, node_crypto_1.randomUUID)()}.tmp`;
    try {
        await (0, promises_1.copyFile)(source, cacheStagingPath, node_fs_1.constants.COPYFILE_EXCL);
        const copiedDigest = await digestFile(cacheStagingPath);
        if (copiedDigest !== expectedSha256) {
            throw new Error(`SHA-256 mismatch while staging the verified cache entry: expected ` +
                `${expectedSha256}, received ${copiedDigest}`);
        }
        try {
            await (0, promises_1.rename)(cacheStagingPath, destination);
            return;
        }
        catch (error) {
            if (!isNodeError(error) ||
                !['EACCES', 'EEXIST', 'ENOTEMPTY', 'EPERM'].includes(error.code ?? '')) {
                throw error;
            }
        }
        const existingDigest = await digestIfPresent(destination, digestFile);
        if (existingDigest === expectedSha256)
            return;
        // Windows cannot atomically replace an existing file with rename. At this
        // point the same-volume replacement has passed every verification gate.
        await (0, promises_1.rm)(destination, { force: true });
        await (0, promises_1.rename)(cacheStagingPath, destination);
    }
    finally {
        await (0, promises_1.rm)(cacheStagingPath, { force: true });
    }
}
async function digestIfPresent(file, digestFile) {
    try {
        await (0, promises_1.access)(file);
        return await digestFile(file);
    }
    catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT')
            return undefined;
        throw error;
    }
}
function isNodeError(error) {
    return error instanceof Error;
}
