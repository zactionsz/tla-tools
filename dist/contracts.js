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
exports.EXPECTED_JAR_ENTRIES = void 0;
exports.requireVersion = requireVersion;
exports.requireSha256 = requireSha256;
exports.releaseUrl = releaseUrl;
exports.installPath = installPath;
exports.javaCommand = javaCommand;
const path = __importStar(require("node:path"));
const RELEASE_BASE_URL = 'https://github.com/zactionsz/tla-tools/releases/download';
const VERSION_PATTERN = /^\d{4}\.\d{2}\.\d{2}\.\d{6}$/;
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;
exports.EXPECTED_JAR_ENTRIES = Object.freeze([
    'tlc2/TLC.class',
    'tlc2/tool/ModelChecker.class',
    'tlc2/tool/distributed/TLCServer.class'
]);
function requireVersion(value) {
    const version = value.trim();
    if (!VERSION_PATTERN.test(version)) {
        throw new Error(`Invalid version ${JSON.stringify(value)}; expected YYYY.MM.DD.HHMMSS`);
    }
    return version;
}
function requireSha256(value) {
    const sha256 = value.trim();
    if (!SHA256_PATTERN.test(sha256)) {
        throw new Error('Invalid sha256; expected exactly 64 hexadecimal characters');
    }
    return sha256.toLowerCase();
}
function releaseUrl(version) {
    return `${RELEASE_BASE_URL}/tla2tools-${version}/tla2tools.jar`;
}
function installPath(toolCache, version, sha256, architecture = process.arch) {
    return path.resolve(toolCache, 'tla-tools', version, architecture, sha256, 'tla2tools.jar');
}
function javaCommand(jarPath, platform = process.platform) {
    return `java -cp ${quoteArgument(jarPath, platform)} tlc2.TLC`;
}
function quoteArgument(value, platform) {
    if (/[\r\n]/u.test(value)) {
        throw new Error('Command arguments cannot contain newlines');
    }
    if (platform === 'win32') {
        return `"${value.replaceAll('"', '""')}"`;
    }
    return `"${value.replace(/["\\$`]/gu, '\\$&')}"`;
}
