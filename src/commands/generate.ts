import { callTool } from "../mcp-client.js";

type Kind = "image" | "video" | "music" | "audio";

interface GenerateStartResult {
    ok: boolean;
    kind: Kind;
    model_id: string;
    generation_id: string | null;
    task_id: string | null;
    credits_used: number | null;
    wait_hint_seconds: number;
}

interface GetGenerationResult {
    found: boolean;
    status?: string;
    output?: unknown;
    error?: string | null;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickOutputUrl(output: unknown): string | null {
    if (!output || typeof output !== "object") return null;
    const candidates: string[] = [];
    function walk(value: unknown): void {
        if (!value) return;
        if (typeof value === "string" && /^https?:\/\//i.test(value)) {
            candidates.push(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }
        if (typeof value === "object") {
            for (const v of Object.values(value as Record<string, unknown>)) walk(v);
        }
    }
    walk(output);
    return candidates[0] ?? null;
}

export async function generateCommand(
    kind: Kind,
    prompt: string,
    options: { modelId?: string; noWait?: boolean; extraInput?: Record<string, unknown> } = {},
): Promise<void> {
    const input: Record<string, unknown> = { prompt, ...(options.extraInput ?? {}) };
    const args: Record<string, unknown> = { input };
    if (options.modelId) args.model_id = options.modelId;

    const toolName = `generate_${kind}` as const;
    console.log("");
    console.log(`  Kicking off ${kind} generation…`);
    const start = await callTool<GenerateStartResult>(toolName, args);

    if (!start.generation_id) {
        console.log("  No generation_id returned — something went wrong.");
        console.log(JSON.stringify(start, null, 2));
        return;
    }

    console.log(`  Model        ${start.model_id}`);
    console.log(`  Generation   ${start.generation_id}`);
    console.log(`  Credits used ${start.credits_used ?? "?"}`);
    if (options.noWait) {
        console.log("");
        console.log(`  Run 'invoomen generation ${start.generation_id}' to check status.`);
        return;
    }

    console.log(`  Waiting (suggested ${start.wait_hint_seconds}s)…`);

    const pollEveryMs = kind === "image" ? 4000 : 6000;
    // Floor at 1 so a wait_hint_seconds=0 from the server (defensive — no
    // current model returns it) still polls at least once instead of
    // bailing out with "still running" before ever checking.
    const maxAttempts = Math.max(1, Math.ceil((start.wait_hint_seconds * 3 * 1000) / pollEveryMs));
    for (let i = 0; i < maxAttempts; i += 1) {
        await sleep(pollEveryMs);
        const status = await callTool<GetGenerationResult>("get_generation", {
            generation_id: start.generation_id,
        });
        if (!status.found) {
            console.log("  Generation not found.");
            return;
        }
        if (status.status === "completed") {
            const url = pickOutputUrl(status.output);
            console.log("");
            if (url) {
                console.log(`  Done. ${url}`);
            } else {
                console.log("  Done. Output:");
                console.log(JSON.stringify(status.output, null, 2));
            }
            console.log("");
            return;
        }
        if (status.status === "failed") {
            console.log("");
            console.log(`  Failed: ${status.error ?? "unknown error"}`);
            console.log("");
            return;
        }
        process.stdout.write(`  Status: ${status.status}\r`);
    }
    console.log("");
    console.log(`  Still running. Run 'invoomen generation ${start.generation_id}' to check later.`);
}

export async function generationStatusCommand(id: string): Promise<void> {
    const result = await callTool<GetGenerationResult>("get_generation", { generation_id: id });
    if (!result.found) {
        console.log(`No generation with id ${id} for this account.`);
        return;
    }
    console.log("");
    console.log(`  Status ${result.status}`);
    if (result.status === "completed") {
        const url = pickOutputUrl(result.output);
        if (url) console.log(`  URL    ${url}`);
        else console.log(`  Output ${JSON.stringify(result.output)}`);
    } else if (result.status === "failed") {
        console.log(`  Error  ${result.error ?? "(no message)"}`);
    }
    console.log("");
}
