# Multi-Tool Setup Guide

This guide helps you configure and use multiple AI coding tools (Claude, OpenCode, Cursor, KiloCode) in Agentic-Kanban-Board.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Provider Selection](#provider-selection)
- [Using Each Provider](#using-each-provider)
- [Agent Configuration](#agent-configuration)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Installation

### Prerequisites

All tools share some common prerequisites:

**Required:**
- Node.js 18.0+ and Bun installed
- Git repository cloned locally

**Tool-Specific:**

| Tool | Installation | Verification |
|-------|-------------|-------------|
| Claude | `npm install -g @anthropic-ai/claude-code` | Run `claude --version` |
| OpenCode | Requires configuration only (no CLI) | Check provider registration |
| Cursor | `npm install -g @kilocode/cli` | Run `kilocode --version` |
| KiloCode | `npm install -g @kilocode/cli` | Run `kilocode --version` |

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**Backend (.env)**:
```env
PORT=3001
NODE_ENV=development

# Claude Code Configuration (optional)
CLAUDE_EXECUTABLE=claude
CLAUDE_TIMEOUT=300000

# OpenCode Configuration
OPENCODE_API_KEY=your_api_key_here
OPENCODE_BASE_URL=https://api.opencode.ai

# Cursor Configuration
CURSOR_MCP_COMMAND=node
CURSOR_MCP_ARGS=["/path/to/mcp-server.js"]
CURSOR_TIMEOUT=300000

# KiloCode Configuration
KILOCODE_EXECUTABLE=kilocode
KILOCODE_TIMEOUT=3600000
KILOCODE_FLAGS=--json

# Optional: Add provider-specific flags
```

**Frontend (.env)**:
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

---

## Configuration

### Provider Registry

All providers are registered in `backend/src/providers/ProviderFactory.ts`:

| Tool Type | Provider Class | Registration |
|------------|---------------|-------------|
| Claude | `ClaudeProvider` | Static import |
| OpenCode | `OpenCodeProvider` | Static import |
| Cursor | `CursorProvider` | Dynamic require() |
| KiloCode | `KiloCodeProvider` | Dynamic require() |

### Configuration File Structure

Configuration is managed through:

1. **Environment Variables**: `.env` file
2. **System Config**: `backend/src/config/env.config.ts` - parses environment variables
3. **Provider Config**: Each provider has its own config interface

---

## Provider Selection

### Supported Tools

| Tool | ToolType | CLI/SDK | Status |
|-------|-----------|-----------|--------|
| Claude Code | `claude` | CLI | ✅ Available |
| OpenCode | `opencode` | SDK | ✅ Available |
| Cursor IDE | `cursor` | MCP (JSON-RPC 2.0) | ✅ Available |
| KiloCode | `kilocode` | CLI | ✅ Available |

### Switching Between Providers

1. **UI Selection**: Use the tool selector dropdown in the session creation dialog
2. **Configuration**: Provider is selected per session, not globally
3. **Session Compatibility**: Each session uses the tool it was created with
4. **Multi-Tool Workflow**: You can run multiple sessions with different tools simultaneously

---

## Using Each Provider

### Claude Code Provider

**Installation:**
```bash
npm install -g @anthropic-ai/claude-code
```

**Configuration:**
- `CLAUDE_EXECUTABLE`: Path to Claude Code CLI (default: `claude`)
- `CLAUDE_TIMEOUT`: Timeout in milliseconds (default: 300000)

**Features:**
- Full session management (create, resume, continue, interrupt, close)
- Agent loading from `~/.claude/agents/`
- Real-time streaming output
- Tool execution (read, write, edit, search, bash)

**CLI Commands:**
```bash
# Start interactive session
claude

# Start with specific working directory
claude --cwd /path/to/project

# Resume previous session
claude --continue --workspace /path/to/project

# Get help
claude --help
```

---

### OpenCode Provider

**Installation:**
No CLI installation required. Uses @opencode-ai/sdk package.

**Configuration:**
- `OPENCODE_API_KEY`: Your OpenCode API key
- `OPENCODE_BASE_URL`: API base URL (default: https://api.opencode.ai)
- `OPENCODE_CONFIG_DIR`: Configuration directory (default: ~/.config/opencode/)

**Features:**
- Event-driven architecture (20+ event hooks)
- Built-in session management API
- File watcher integration
- Permission hooks
- Plugin system for extensions

**API Client Pattern:**
```typescript
import { createOpencode } from "@opencode-ai/sdk";

const { client } = await createOpencode({
  apiKey: process.env.OPENCODE_API_KEY
});

// Create session
const session = await client.session.create({
  body: { title: "My Session" }
});

// Subscribe to events
const events = await client.event.subscribe();
for await (const event of events.stream) {
  if (event.type === 'message.part.updated') {
    handleStreamEvent(event);
  }
}
```

**Event Types:**
- `message.part.updated` - Streaming message updates
- `session.created` - New session created
- `session.completed` - Session finished
- `error` - Error occurred

---

### Cursor IDE Provider

**Installation:**
```bash
npm install -g @kilocode/cli
```

**Configuration:**
- `CURSOR_MCP_COMMAND`: MCP server executable (default: `node`)
- `CURSOR_MCP_ARGS`: MCP server arguments as JSON array
- `CURSOR_TIMEOUT`: MCP operation timeout (default: 300000)

**Features:**
- MCP (Model Context Protocol) integration
- JSON-RPC 2.0 over stdio transport
- Tool registration via MCP protocol
- Session management with graceful shutdown
- Agent loading from MCP server configurations

**MCP Server Setup:**

Create MCP server configuration in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "file-server": {
      "command": "node",
      "args": ["/path/to/file-server.js"]
    }
  }
}
```

**Environment Variables:**
```bash
# Add MCP server to Cursor
export CURSOR_MCP_SERVERS='{"file-server":{"command":"node","args":["/path/to/server.js"]}}'
```

---

### KiloCode Provider

**Installation:**
```bash
npm install -g @kilocode/cli
```

**Configuration:**
- `KILOCODE_EXECUTABLE`: Path to KiloCode CLI (default: `kilocode`)
- `KILOCODE_TIMEOUT`: Timeout in milliseconds (default: 3600000)
- `KILOCODE_FLAGS`: Additional CLI flags (default: empty)

**Features:**
- CLI-based agent orchestration
- JSON streaming output (`--json` flag)
- Agent loading from `~/.kilocode/agents/`
- Multiple modes (build, plan, debug, code)
- Real-time streaming via stdout/stderr

**CLI Commands:**
```bash
# Start TUI
kilocode

# Start with JSON output
kilocode --auto --json "your prompt here"

# Continue previous session
kilocode --continue "your input"

# Use specific mode
kilocode --mode architect

# Resume workspace
kilocode --workspace /path/to/project

# Get help
kilocode --help
```

---

## Agent Configuration

### Claude Code Agents

**Location:** `~/.claude/agents/`

**Agent File Format:**
```markdown
# Agent Name

You are a specialized [role] agent for [specific task].

## Instructions

- Rule 1: [specific instruction]
- Rule 2: [specific instruction]
- ...

## Examples

### Example 1: [task description]
[Step-by-step approach]

### Example 2: [another task]
[Alternative approach]
```

**Built-in Agents:**
KiloCode, Cursor, and OpenCode use different agent systems. Refer to their documentation for agent configuration.

### OpenCode Agents

**Location:** `~/.config/opencode/` (or custom path set in `OPENCODE_CONFIG_DIR`)

**Agent Format:**
OpenCode uses plugins that define agent behavior through OpenCode's plugin system.

### Cursor MCP Servers

**Location:** `~/.cursor/mcp.json` or `.cursor/mcp.json`

**MCP Server Format:**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable",
      "args": ["arg1", "arg2"],
      "env": {
        "KEY": "value"
      }
    }
  }
}
```

**KiloCode Agents**

**Location:** `~/.kilocode/agents/`

**Agent Format:** Similar to Claude Code (Markdown-based)

---

## Troubleshooting

### Common Issues

#### Provider Not Available

**Problem:** Selected provider not available

**Solutions:**
1. Verify provider is registered in `ProviderFactory.ts`
2. Check environment variables are set
3. Ensure backend is restarted after configuration changes
4. Check browser console for configuration errors

**Debug Steps:**
```bash
# Check if provider is registered
cd backend
bun run ts-node -e "console.log(ProviderFactory.getRegisteredTools())"

# Test provider creation
bun test providers/ProviderFactory.test.ts
```

#### Session Creation Fails

**Problem:** Cannot create new session

**Possible Causes:**
1. Provider not initialized
2. Invalid configuration
3. Network timeout
4. Missing dependencies

**Solutions:**
1. Check backend logs: `tail -f logs/app.log`
2. Verify environment variables in `.env`
3. Ensure provider CLI is installed and accessible
4. Check database connection

#### CLI/Process Errors

**Problem:** CLI process exits with error

**Possible Causes:**
1. Invalid CLI arguments
2. Missing configuration files
3. File system permissions
4. CLI not found in PATH

**Solutions:**
1. Test CLI manually: Run command directly in terminal
2. Check CLI version matches expected version
3. Verify configuration paths are correct
4. Check file system permissions

#### JSON Stream Parsing Errors

**Problem:** Invalid or malformed JSON output from CLI

**Possible Causes:**
1. CLI version incompatibility
2. Non-JSON output format
3. Output encoding issues

**Solutions:**
1. Verify CLI version supports JSON output flag
2. Check if JSON output format changed
3. Ensure UTF-8 encoding
4. Check provider's stream parser implementation

#### Performance Issues

**Problem:** Slow response times or high resource usage

**Possible Causes:**
1. Too many concurrent sessions
2. Large context windows
3. Missing timeouts
4. Inefficient database queries

**Solutions:**
1. Monitor session count (use system stats)
2. Adjust timeout values per provider
3. Implement session cleanup for completed sessions
4. Add connection pooling (already implemented in SessionService)

---

## FAQ

### General Questions

**Q: Can I use multiple tools simultaneously?**
A: Yes! Each session can use a different tool provider. Run multiple sessions in parallel with different tools.

**Q: How do I switch providers?**
A: Use the tool selector dropdown when creating a new session. The provider selection is saved with each session.

**Q: Are sessions compatible across providers?**
A: No. Sessions created with one provider must use that same provider. You cannot resume a Claude session using Cursor, for example.

**Q: What if a CLI tool is not installed?**
A: Sessions for that provider will fail. Install the missing CLI or set the correct environment variable for the executable path.

**Q: Can I use OpenCode without an API key?**
A: No. The provider will throw an error during initialization if `OPENCODE_API_KEY` is not set.

**Q: How do I configure MCP servers for Cursor?**
A: Create or edit `~/.cursor/mcp.json` for global servers, or `.cursor/mcp.json` for project-specific servers. The configuration format supports command, args, and environment variables.

**Q: What happens to my agents when I switch tools?**
A: Each tool has its own agent system:
- Claude: Uses `~/.claude/agents/`
- OpenCode: Uses `~/.config/opencode/` 
- Cursor: Uses MCP servers defined in `~/.cursor/mcp.json`
- KiloCode: Uses `~/.kilocode/agents/`

You need to configure agents separately for each tool.

---

## Performance Tips

### Optimize Performance

1. **Limit Concurrent Sessions**: Don't run more than 3-5 sessions simultaneously
2. **Use Appropriate Timeouts**: Adjust timeout values based on task complexity
3. **Clean Up Sessions**: Delete completed sessions regularly
4. **Monitor Resources**: Use system stats to track resource usage

### Optimize Database Queries

1. **Use Indexes**: Ensure frequently queried fields are indexed
2. **Pagination**: Use pagination for large result sets
3. **Connection Pooling**: Already implemented in SessionService
4. **Batch Operations**: Group multiple database operations when possible

---

## Support and Resources

### Documentation

- [Multi-Tool Architecture Plan](docs/MULTI_TOOL_ARCHITECTURE_PLAN.md)
- [Provider Implementation Guide](backend/src/providers/)
- [Type Definitions](backend/src/types/provider.types.ts)

### Getting Help

- Check existing issues: [GitHub Issues](https://github.com/calebrosario/Agentic-Kanban-Board/issues)
- Create new issue with template: [Issue Template](docs/ISSUE_TEMPLATE.md)
- Check documentation in `docs/` directory

---

## Changelog

### Version 1.0.0

- Initial documentation
- Support for Claude, OpenCode, Cursor, and KiloCode providers
- Configuration guide and troubleshooting
