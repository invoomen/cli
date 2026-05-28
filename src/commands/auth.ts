import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { clearApiKey, getBaseUrl, loadConfig, setApiKey } from "../config.js";

function openBrowser(url: string) {
    const platform = process.platform;
    const command =
        platform === "win32" ? `start "" "${url}"`
        : platform === "darwin" ? `open "${url}"`
        : `xdg-open "${url}"`;
    void import("node:child_process").then(({ exec }) => {
        exec(command, (err) => {
            // Failure is non-fatal — user can paste the URL manually — but say
            // so. Silent failure on headless / no-browser systems is confusing.
            if (err) {
                console.warn(`(could not auto-open browser: ${err.message})`);
            }
        });
    });
}

export async function authLogin(): Promise<void> {
    const baseUrl = getBaseUrl();
    const settingsUrl = `${baseUrl}/settings?section=api-keys`;

    console.log("");
    console.log(`Opening ${settingsUrl} in your browser…`);
    console.log("If it doesn't open, copy/paste the URL above.");
    console.log("Create a new API key, copy it (starts with ivk_live_), and paste it below.");
    console.log("");

    openBrowser(settingsUrl);

    const rl = createInterface({ input, output });
    let key: string;
    try {
        key = (await rl.question("API key: ")).trim();
    } finally {
        rl.close();
    }

    if (!key.startsWith("ivk_live_") || key.length < 30) {
        throw new Error("that doesn't look like an Invoomen API key (expected ivk_live_…).");
    }

    setApiKey(key);
    console.log("");
    console.log(`Saved to ${process.env.USERPROFILE || process.env.HOME}/.invoomen/config.json`);
    console.log("Try: invoomen balance");
}

export function authLogout(): void {
    clearApiKey();
    console.log("Logged out. API key removed from local config.");
}

export function authWhoami(): void {
    const config = loadConfig();
    if (!config.apiKey) {
        console.log("Not logged in. Run: invoomen auth login");
        return;
    }
    const masked = `${config.apiKey.slice(0, 12)}••••${config.apiKey.slice(-4)}`;
    console.log(`Logged in. Using key ${masked} on ${getBaseUrl()}.`);
}
