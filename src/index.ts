#!/usr/bin/env node
import { authLogin, authLogout, authWhoami } from "./commands/auth.js";
import { balanceCommand } from "./commands/balance.js";
import { generateCommand, generationStatusCommand } from "./commands/generate.js";
import { installCommand, type InstallTarget } from "./commands/install.js";
import { listGenerationsCommand, listModelsCommand } from "./commands/list.js";

const HELP = `Invoomen CLI

Usage
  invoomen <command> [args]

Commands
  auth login                  Open browser, paste API key, save it locally
  auth logout                 Remove local API key
  auth whoami                 Show which key is active

  balance                     Show your current credit balance
  list models [kind]          List available models (kind: image|video|music|audio)
  list generations            Show recent generations

  generate image "<prompt>"   Generate an image and wait for the URL
  generate video "<prompt>"   Generate a video (longer wait)
  generate music "<prompt>"   Generate music with Suno
  generate audio "<prompt>"   Generate speech / dialogue
        flags:
          --model <id>        Pin a specific model
          --no-wait           Return immediately with the generation_id

  generation <id>             Check status of a specific generation

  mcp install <target>        Wire Invoomen into your assistant
                              target: claude | claude-code | codex | cursor

Examples
  invoomen auth login
  invoomen generate image "cinematic dolly-in of a hummingbird at golden hour"
  invoomen mcp install claude
  invoomen list models image

Get an API key: https://invoomen.com/settings?section=api-keys
Docs: https://invoomen.com/cli
`;

function parseFlag<T extends string>(args: string[], names: T[]): { value: string | null; rest: string[] } {
    const rest: string[] = [];
    let value: string | null = null;
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (names.includes(arg as T)) {
            value = args[i + 1] ?? null;
            i += 1;
            continue;
        }
        rest.push(arg);
    }
    return { value, rest };
}

function hasFlag(args: string[], names: string[]): boolean {
    return args.some((a) => names.includes(a));
}

async function main() {
    const [command, ...rest] = process.argv.slice(2);

    if (!command || command === "--help" || command === "-h" || command === "help") {
        console.log(HELP);
        return;
    }

    try {
        switch (command) {
            case "auth": {
                const sub = rest[0];
                if (sub === "login") return await authLogin();
                if (sub === "logout") return authLogout();
                if (sub === "whoami") return authWhoami();
                throw new Error("usage: invoomen auth <login|logout|whoami>");
            }
            case "balance":
                return await balanceCommand();
            case "list": {
                const sub = rest[0];
                if (sub === "models") return await listModelsCommand(rest[1]);
                if (sub === "generations") return await listGenerationsCommand();
                throw new Error("usage: invoomen list <models|generations>");
            }
            case "generate": {
                const kind = rest[0];
                if (!["image", "video", "music", "audio"].includes(kind)) {
                    throw new Error("usage: invoomen generate <image|video|music|audio> \"<prompt>\"");
                }
                const remaining = rest.slice(1);
                const { value: modelId, rest: r2 } = parseFlag(remaining, ["--model", "-m"]);
                const noWait = hasFlag(r2, ["--no-wait", "-n"]);
                const promptParts = r2.filter((a) => !a.startsWith("--") && a !== "-n");
                const prompt = promptParts.join(" ").trim();
                if (!prompt) {
                    throw new Error("prompt is required. Wrap multi-word prompts in quotes.");
                }
                return await generateCommand(kind as "image" | "video" | "music" | "audio", prompt, {
                    modelId: modelId ?? undefined,
                    noWait,
                });
            }
            case "generation": {
                const id = rest[0];
                if (!id) throw new Error("usage: invoomen generation <id>");
                return await generationStatusCommand(id);
            }
            case "mcp": {
                const sub = rest[0];
                const target = rest[1] as InstallTarget;
                if (sub !== "install") throw new Error("usage: invoomen mcp install <claude|claude-code|codex|cursor>");
                if (!target) throw new Error("usage: invoomen mcp install <claude|claude-code|codex|cursor>");
                return installCommand(target);
            }
            default:
                console.log(HELP);
                console.log(`\nUnknown command: ${command}`);
                process.exit(1);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n  Error: ${message}\n`);
        process.exit(1);
    }
}

void main();
