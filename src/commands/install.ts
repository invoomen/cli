import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

import { stringify as stringifyToml, parse as parseToml } from "@iarna/toml";

import { getApiKey, mcpServerUrl } from "../config.js";

export type InstallTarget = "claude" | "claude-code" | "codex" | "cursor";

/** The object shape @iarna/toml's `stringify` accepts — its internal `JsonMap`,
 *  which the package does not export. Derived from the function signature so it
 *  always matches `parse`'s return type and `stringify`'s parameter type. */
type TomlTable = Parameters<typeof stringifyToml>[0];

function claudeDesktopConfigPath(): string {
    if (platform() === "win32") {
        const appdata = process.env.APPDATA;
        if (!appdata) throw new Error("APPDATA environment variable not set");
        return join(appdata, "Claude", "claude_desktop_config.json");
    }
    if (platform() === "darwin") {
        return join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
    }
    return join(homedir(), ".config", "Claude", "claude_desktop_config.json");
}

function readJson(path: string): Record<string, unknown> {
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function writeJson(path: string, data: Record<string, unknown>) {
    mkdirSync(dirname(path), { recursive: true });
    // 0o600 — the file embeds the user's plaintext API key in the
    // Authorization header. Ignored on Windows (NTFS perms come from the
    // parent dir's ACL).
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
}

function installClaudeDesktop(): string {
    const apiKey = getApiKey();
    const path = claudeDesktopConfigPath();
    const config = readJson(path);
    const servers = (config.mcpServers as Record<string, unknown> | undefined) ?? {};
    servers.invoomen = {
        type: "http",
        url: mcpServerUrl(),
        headers: { Authorization: `Bearer ${apiKey}` },
    };
    config.mcpServers = servers;
    writeJson(path, config);
    return path;
}

function installClaudeCode(): string {
    const apiKey = getApiKey();
    const path = join(homedir(), ".claude.json");
    const config = readJson(path);
    const servers = (config.mcpServers as Record<string, unknown> | undefined) ?? {};
    servers.invoomen = {
        type: "http",
        url: mcpServerUrl(),
        headers: { Authorization: `Bearer ${apiKey}` },
    };
    config.mcpServers = servers;
    writeJson(path, config);
    return path;
}

function installCodex(): string {
    const apiKey = getApiKey();
    const path = join(homedir(), ".codex", "config.toml");
    mkdirSync(dirname(path), { recursive: true });

    let existing: TomlTable = {};
    if (existsSync(path)) {
        try {
            existing = parseToml(readFileSync(path, "utf8"));
        } catch {
            existing = {};
        }
    }

    const mcpServers = (existing.mcp_servers as TomlTable | undefined) ?? {};
    mcpServers.invoomen = {
        type: "http",
        url: mcpServerUrl(),
        headers: { Authorization: `Bearer ${apiKey}` },
    };
    existing.mcp_servers = mcpServers;

    writeFileSync(path, stringifyToml(existing), { mode: 0o600 });
    return path;
}

function installCursor(): string {
    const apiKey = getApiKey();
    const path = join(homedir(), ".cursor", "mcp.json");
    const config = readJson(path);
    const servers = (config.mcpServers as Record<string, unknown> | undefined) ?? {};
    servers.invoomen = {
        type: "http",
        url: mcpServerUrl(),
        headers: { Authorization: `Bearer ${apiKey}` },
    };
    config.mcpServers = servers;
    writeJson(path, config);
    return path;
}

export function installCommand(target: InstallTarget): void {
    let path: string;
    switch (target) {
        case "claude":
            path = installClaudeDesktop();
            break;
        case "claude-code":
            path = installClaudeCode();
            break;
        case "codex":
            path = installCodex();
            break;
        case "cursor":
            path = installCursor();
            break;
        default:
            throw new Error(`unknown install target: ${target}. Valid: claude, claude-code, codex, cursor.`);
    }
    console.log("");
    console.log(`  Wrote Invoomen MCP entry to ${path}`);
    console.log(`  Restart ${target} to pick up the new server.`);
    console.log("");
}
