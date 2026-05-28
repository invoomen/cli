import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const CONFIG_DIR = join(homedir(), ".invoomen");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface CliConfig {
    apiKey?: string;
    baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://invoomen.com";

function ensureConfigDir() {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
}

export function loadConfig(): CliConfig {
    if (!existsSync(CONFIG_FILE)) return {};
    try {
        const raw = readFileSync(CONFIG_FILE, "utf8");
        return JSON.parse(raw) as CliConfig;
    } catch {
        return {};
    }
}

export function saveConfig(config: CliConfig) {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getBaseUrl(): string {
    return process.env.INVOOMEN_BASE_URL ?? loadConfig().baseUrl ?? DEFAULT_BASE_URL;
}

export function getApiKey(): string {
    const fromEnv = process.env.INVOOMEN_API_KEY;
    if (fromEnv) return fromEnv;
    const fromConfig = loadConfig().apiKey;
    if (fromConfig) return fromConfig;
    throw new Error(
        "no API key configured. Run 'invoomen auth login' to get started, or set INVOOMEN_API_KEY in your environment.",
    );
}

export function setApiKey(apiKey: string) {
    const config = loadConfig();
    config.apiKey = apiKey;
    saveConfig(config);
}

export function clearApiKey() {
    const config = loadConfig();
    delete config.apiKey;
    saveConfig(config);
}

export function mcpServerUrl(): string {
    return `${getBaseUrl()}/api/mcp`;
}

// Helper exported for tests / advanced usage to set arbitrary config paths.
export function configPathForFile(file: string): string {
    return join(dirname(CONFIG_FILE), file);
}
