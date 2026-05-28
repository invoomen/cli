import { getApiKey, mcpServerUrl } from "./config.js";

interface JsonRpcRequest {
    jsonrpc: "2.0";
    id: number;
    method: string;
    params?: Record<string, unknown>;
}

interface JsonRpcResponse<T = unknown> {
    jsonrpc: "2.0";
    id: number;
    result?: T;
    error?: { code: number; message: string; data?: unknown };
}

interface ToolCallResult {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: unknown;
    isError?: boolean;
}

let requestCounter = 0;
function nextId(): number {
    requestCounter += 1;
    return requestCounter;
}

async function rpc<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const body: JsonRpcRequest = { jsonrpc: "2.0", id: nextId(), method, params };
    const url = mcpServerUrl();
    const apiKey = getApiKey();

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            authorization: `Bearer ${apiKey}`,
            "mcp-protocol-version": "2025-06-18",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`MCP request failed (${response.status}): ${text.slice(0, 200)}`);
    }

    const text = await response.text();
    // The server may respond with either application/json or text/event-stream.
    // For stateless JSON mode it's plain JSON.
    let payload: JsonRpcResponse<T>;
    try {
        payload = JSON.parse(text) as JsonRpcResponse<T>;
    } catch {
        // Fall back to parsing an SSE-framed response. Use `[\s\S]` not `.` so
        // we capture multi-line JSON objects too — bare `.` does not match
        // newlines even with the /m flag.
        const match = text.match(/^data:\s*([\s\S]*?\})\s*$/m);
        if (!match) {
            throw new Error(`unexpected MCP response: ${text.slice(0, 200)}`);
        }
        payload = JSON.parse(match[1]) as JsonRpcResponse<T>;
    }

    if (payload.error) {
        throw new Error(`MCP error (${payload.error.code}): ${payload.error.message}`);
    }
    return payload.result as T;
}

let initialized = false;
async function ensureInitialized() {
    if (initialized) return;
    await rpc<unknown>("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "invoomen-cli", version: "0.1.0" },
    });
    initialized = true;
}

export async function callTool<T = unknown>(
    name: string,
    args: Record<string, unknown> = {},
): Promise<T> {
    await ensureInitialized();
    const result = await rpc<ToolCallResult>("tools/call", { name, arguments: args });
    if (result.isError) {
        const message = result.content?.[0]?.text ?? "unknown tool error";
        throw new Error(message);
    }
    if (result.structuredContent !== undefined) {
        return result.structuredContent as T;
    }
    const text = result.content?.[0]?.text;
    if (text) {
        try {
            return JSON.parse(text) as T;
        } catch {
            return text as unknown as T;
        }
    }
    return null as unknown as T;
}

export async function listTools(): Promise<{ tools: Array<{ name: string; description: string }> }> {
    await ensureInitialized();
    return rpc("tools/list");
}
