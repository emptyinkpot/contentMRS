import { existsSync, readFileSync } from "node:fs";
function optionalEnv(source, name) {
    const value = source[name];
    return value || undefined;
}
function numberEnv(source, name, fallback) {
    const raw = source[name];
    if (!raw)
        return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid numeric environment variable: ${name}`);
    }
    return value;
}
function parseEnvFile(filePath) {
    const source = {};
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const separator = trimmed.indexOf("=");
        if (separator <= 0)
            continue;
        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        source[key] = value;
    }
    return source;
}
export function resolveOpenListEnv(source = process.env) {
    const configuredFile = source.OPENLIST_ENV_FILE;
    const candidateFiles = [
        configuredFile,
        "C:\\Users\\ASUS-KL\\.codex-secrets\\openlist-obsidian-sync.env"
    ].filter((value) => Boolean(value));
    const fileValues = candidateFiles.find((filePath) => existsSync(filePath))
        ? parseEnvFile(candidateFiles.find((filePath) => existsSync(filePath)))
        : {};
    return {
        ...fileValues,
        ...source
    };
}
export function loadConfig() {
    const env = resolveOpenListEnv();
    return {
        host: env.DATABASE_OPENLIST_ADAPTER_HOST || "127.0.0.1",
        port: numberEnv(env, "DATABASE_OPENLIST_ADAPTER_PORT", 18110),
        openlist: {
            baseUrl: env.OPENLIST_BASE_URL || "http://127.0.0.1:5244",
            token: optionalEnv(env, "OPENLIST_TOKEN"),
            username: optionalEnv(env, "OPENLIST_USERNAME"),
            passwordHash: optionalEnv(env, "OPENLIST_PASSWORD_HASH")
        }
    };
}
