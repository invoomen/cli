import { callTool } from "../mcp-client.js";

interface ModelEntry {
    id: string;
    name: string;
    kind: string;
    credits: number;
    provider: string;
}

interface ListModelsResult {
    count: number;
    models: ModelEntry[];
}

interface GenerationEntry {
    generation_id: string;
    model_id: string;
    status: string;
    kind: string;
    credits_used: number;
    created_at: string;
}

interface ListGenerationsResult {
    count: number;
    items: GenerationEntry[];
}

function padRight(str: string, n: number): string {
    return str.length >= n ? str.slice(0, n) : str + " ".repeat(n - str.length);
}

export async function listModelsCommand(kind?: string): Promise<void> {
    const args: Record<string, unknown> = {};
    if (kind) args.kind = kind;
    const result = await callTool<ListModelsResult>("list_models", args);

    console.log("");
    console.log(`  ${result.count} model${result.count === 1 ? "" : "s"}${kind ? ` (${kind})` : ""}`);
    console.log("");
    console.log(`  ${padRight("ID", 42)} ${padRight("KIND", 6)} ${padRight("CREDITS", 8)} NAME`);
    console.log(`  ${"-".repeat(42)} ${"-".repeat(6)} ${"-".repeat(8)} ${"-".repeat(30)}`);
    for (const model of result.models) {
        console.log(
            `  ${padRight(model.id, 42)} ${padRight(model.kind, 6)} ${padRight(String(model.credits), 8)} ${model.name}`,
        );
    }
    console.log("");
}

export async function listGenerationsCommand(limit = 20): Promise<void> {
    const result = await callTool<ListGenerationsResult>("list_recent_generations", { limit });

    console.log("");
    console.log(`  ${result.count} recent generation${result.count === 1 ? "" : "s"}`);
    console.log("");
    console.log(`  ${padRight("ID", 36)} ${padRight("KIND", 6)} ${padRight("STATUS", 11)} ${padRight("CREDITS", 8)} MODEL`);
    console.log(`  ${"-".repeat(36)} ${"-".repeat(6)} ${"-".repeat(11)} ${"-".repeat(8)} ${"-".repeat(30)}`);
    for (const item of result.items) {
        console.log(
            `  ${padRight(item.generation_id, 36)} ${padRight(item.kind ?? "?", 6)} ${padRight(item.status, 11)} ${padRight(String(item.credits_used ?? 0), 8)} ${item.model_id}`,
        );
    }
    console.log("");
}
