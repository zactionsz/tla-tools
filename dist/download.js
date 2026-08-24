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
exports.MAX_JAR_BYTES = void 0;
exports.download = download;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const path = __importStar(require("node:path"));
const node_stream_1 = require("node:stream");
const promises_2 = require("node:stream/promises");
exports.MAX_JAR_BYTES = 64 * 1024 * 1024;
async function download(url, destination, fetchImpl = fetch) {
    await (0, promises_1.mkdir)(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${(0, node_crypto_1.randomUUID)()}.tmp`;
    try {
        const response = await fetchImpl(url, {
            headers: { 'user-agent': 'zactionsz/tla-tools' },
            redirect: 'follow'
        });
        if (!response.ok) {
            throw new Error(`Download failed with HTTP ${response.status} for ${url}`);
        }
        if (!response.body) {
            throw new Error(`Download returned an empty response body for ${url}`);
        }
        const declaredLength = Number(response.headers.get('content-length'));
        if (Number.isFinite(declaredLength) && declaredLength > exports.MAX_JAR_BYTES) {
            throw new Error(`Download exceeds the ${exports.MAX_JAR_BYTES}-byte safety limit`);
        }
        let received = 0;
        const limit = new node_stream_1.Transform({
            transform(chunk, _encoding, callback) {
                received += chunk.length;
                if (received > exports.MAX_JAR_BYTES) {
                    callback(new Error(`Download exceeds the ${exports.MAX_JAR_BYTES}-byte safety limit`));
                    return;
                }
                callback(null, chunk);
            }
        });
        await (0, promises_2.pipeline)(node_stream_1.Readable.from(response.body), limit, (0, node_fs_1.createWriteStream)(temporary, { flags: 'wx' }));
        await (0, promises_1.rename)(temporary, destination);
    }
    catch (error) {
        await (0, promises_1.rm)(temporary, { force: true });
        throw error;
    }
}
