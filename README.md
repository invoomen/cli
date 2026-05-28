# @invoomen/cli

Command-line interface for [Invoomen](https://invoomen.com). Generate images,
videos, and music from your terminal, and install Invoomen as an MCP server in
Claude Desktop, Claude Code, OpenAI Codex CLI, or Cursor.

Source: [github.com/invoomen/cli](https://github.com/invoomen/cli).

## Install

> **Status: not yet published to npm.** Until the package is published,
> install from source:
>
> ```bash
> git clone https://github.com/invoomen/cli.git
> cd cli
> npm install
> npm run build
> npm link        # makes the `invoomen` command available globally
> ```

```bash
# Once published:
npm install -g @invoomen/cli
```

## Log in

```bash
invoomen auth login
```

Opens your browser to `invoomen.com/settings?section=api-keys`. Create a key
(starts with `ivk_live_…`), paste it back into the CLI. The key is stored at
`~/.invoomen/config.json` with mode `0600`.

## Common commands

```bash
# Check your credit balance
invoomen balance

# Generate an image
invoomen generate image "cinematic dolly-in of a hummingbird"

# Generate with a specific model
invoomen generate video "a fox running through a forest" --model wan/2-6-text-to-video

# List available models
invoomen list models image

# Install Invoomen as an MCP server in your AI assistant
invoomen mcp install claude        # Claude Desktop
invoomen mcp install claude-code   # Claude Code (project-aware)
invoomen mcp install codex         # OpenAI Codex CLI
invoomen mcp install cursor        # Cursor IDE
```

## Environment overrides

| Variable | Default | Purpose |
|---|---|---|
| `INVOOMEN_API_KEY` | (from config file) | Override the saved API key |
| `INVOOMEN_BASE_URL` | `https://invoomen.com` | Point at a different deployment |

## Build

```bash
npm install
npm run build
```

The compiled output goes to `dist/`. `dist/index.js` is the `invoomen` binary.

## License

MIT
