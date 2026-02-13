# Multi-Tool Architecture Plan for Agentic-Kanban-Board

**Primary Recommendation: Option 1 - Provider Interface Pattern**

This document provides a comprehensive architectural plan for expanding Agentic-Kanban-Board to support multiple AI coding tools (beyond just Claude Code), specifically targeting OpenCode, KiloCode, Codex, and Cursor.

---

## Table of Contents

1. [Primary Recommendation: Option 1 - Provider Interface Pattern](#primary-recommendation-option-1---provider-interface-pattern)
2. [Architecture Overview](#architecture-overview)
3. [Alternative Implementation Options](#alternative-implementation-options)
4. [Abstraction Strategy](#abstraction-strategy)
5. [Migration Path](#migration-path)
6. [Tool-Specific Considerations](#tool-specific-considerations)
7. [Decision Framework](#decision-framework)

---

## Primary Recommendation: Option 1 - Provider Interface Pattern

### Summary

The **Provider Interface Pattern** is the recommended approach for implementing multi-tool support in Agentic-Kanban-Board. This pattern creates a clean interface-based abstraction with concrete implementations for each tool. The application interacts only with `IToolProvider`, never knowing which tool is active.

### Why This Option?

| Factor | Assessment |
|---------|-------------|
| **Complexity** | Low-Medium - Clear, straightforward implementation |
| **Development Time** | 2-3 weeks (2 developers) |
| **Maintainability** | High - Easy to understand and modify |
| **Testability** | High - Providers testable in isolation |
| **Extensibility** | Medium - Add new tools by implementing interface |
| **Performance** | Low overhead - Minimal abstraction layer |
| **Risk Level** | Medium - Proven pattern, low risk |
| **Backward Compatibility** | Excellent - Existing code preserved |
| **Learning Curve** | Low - Familiar to most developers |

### Core Architecture

```typescript
// Main interface that all tools must implement
interface IToolProvider {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly capabilities: ToolCapabilities;

  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  shutdown(): Promise<void>;

  // Session Management
  createSession(options: SessionOptions): Promise<ToolSession>;
  resumeSession(sessionId: string, context: ResumeContext): Promise<ToolSession>;
  continueSession(sessionId: string, input: string): Promise<ToolSession>;

  // Agent Management
  loadAgents(agentsPath: string): Promise<Agent[]>;

  // Stream Handling
  execute(input: string, sessionId: string): AsyncIterable<StreamEvent>;
}

// Standardized stream events across all tools
interface StreamEvent {
  type: 'delta' | 'message' | 'tool_call' | 'session_id' | 'error';
  data: any;
  timestamp: Date;
}

// Tool capabilities to inform UI and logic
interface ToolCapabilities {
  supportsAgents: boolean;
  supportsResume: boolean;
  supportsContinue: boolean;
  realTimeStreaming: boolean;
  supportedTools: string[];
}
```

### Provider Implementation Structure

```
backend/src/providers/
├── IToolProvider.ts           # Core interface
├── ProviderFactory.ts           # Factory for creating providers
├── ClaudeProvider.ts            # Claude Code CLI implementation
├── OpenCodeProvider.ts          # OpenCode SDK implementation
├── CursorProvider.ts            # Cursor MCP implementation
└── BaseProvider.ts             # Shared base class (optional)
```

### Integration with Existing Code

The SessionService becomes a simple orchestrator:

```typescript
class SessionService {
  private activeProviders = new Map<string, IToolProvider>();

  async createSession(
    userId: string,
    toolType: string,  // 'claude' | 'opencode' | 'cursor'
    projectId: string
  ): Promise<Session> {
    // 1. Get or create provider
    const provider = await this.getOrCreateProvider(toolType);

    // 2. Create tool session
    const toolSession = await provider.createSession({
      title: `Session ${Date.now()}`,
      workingDirectory: getProjectPath(projectId)
    });

    // 3. Create database session
    const session = await this.sessionRepository.create({
      userId,
      projectId,
      toolType,
      toolSessionId: toolSession.id
    });

    return session;
  }

  private async getOrCreateProvider(toolType: string): Promise<IToolProvider> {
    if (!this.activeProviders.has(toolType)) {
      const provider = ProviderFactory.create(toolType);
      await provider.initialize(this.getProviderConfig(toolType));
      this.activeProviders.set(toolType, provider);
    }
    return this.activeProviders.get(toolType);
  }
}
```

---

## Architecture Overview

### Current State (Claude Only)

```
┌─────────────────────────────────────────────────────────────┐
│                    Agentic-Kanban-Board                │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/Vite)    Backend (Node/TS)         │
│  ┌─────────────────┐      ┌───────────────────────┐   │
│  │  UI Components   │      │  SessionService      │   │
│  │  (Zustand)      │◄────►│  ProcessManager      │   │
│  └────────┬────────┘      └───────────┬───────────┘   │
│           │                            │                   │
│           │ WebSocket                 │                   │
│           ▼                            ▼                   │
│  ┌─────────────────┐      ┌───────────────────────┐   │
│  │  MessageStore   │◄────►│  StreamProcessor     │   │
│  │  (Real-time)    │      │  (Claude JSON parse) │   │
│  └─────────────────┘      └───────────┬───────────┘   │
│                                      │ CLI spawn        │
│                                      ▼                 │
│                              ┌───────────────────────┐   │
│                              │  Claude Code CLI     │   │
│                              └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Target Multi-Tool Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Agentic-Kanban-Board (Multi-Tool)         │
├─────────────────────────────────────────────────────────────┤
│  Frontend                           Backend           │
│  ┌─────────────────┐      ┌───────────────────────┐   │
│  │  ToolSelector   │◄────►│  ProviderFactory    │   │
│  │  (Dropdown)     │      │  (Factory Pattern)   │   │
│  └────────┬────────┘      └───────────┬───────────┘   │
│           │                            │                   │
│           │ WebSocket                 │                   │
│           │                            │                   │
│           ▼                            ▼                   │
│  ┌─────────────────┐      ┌───────────────────────┐   │
│  │  MessageStore   │◄────►│  SessionService      │   │
│  │  (Tool-Agnostic)│      │  (Orchestrator)      │   │
│  └─────────────────┘      └───────────┬───────────┘   │
│                                      │                   │
│                                      ▼                   │
│                              ┌───────────────────────┐   │
│                              │  IToolProvider      │   │
│                              │  (Interface)         │   │
│                              └───────────┬───────────┘   │
│                                          │                │
│                   ┌────────────────────────┼────────────────┐  │
│                   ▼                    ▼                ▼  │
│          ┌─────────────┐   ┌──────────┐   ┌──────────┐ │
│          │ClaudeProvider│   │OpenCode  │   │Cursor    │ │
│          │(CLI spawn)  │   │Provider  │   │Provider  │ │
│          │             │   │(SDK)     │   │(MCP)     │ │
│          └─────────────┘   └──────────┘   └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Alternative Implementation Options

### Option 2: Strategy Pattern with Runtime Registration

**Description**: Use strategy pattern where tool-specific behaviors are injected at runtime. More flexible but requires careful management of state and lifecycle.

#### Pros
- Highly flexible, runtime composition
- Mix and match strategies
- Easy to swap implementations
- Good for plugins

#### Cons
- Complex state management
- Harder to debug
- More indirection
- Risk of invalid combinations

#### Effort: 2-3 weeks | Risk: **High**

### Option 3: Microservice-Based Tool Integration

**Description**: Each tool runs in its own microservice, communicating via HTTP/WebSocket. The main app is a lightweight orchestrator.

#### Pros
- Independent deployment/scaling
- Tool crashes don't affect main app
- Language-agnostic services
- Easy to add new tools as services

#### Cons
- Significant infrastructure overhead
- Network latency
- Complex deployment
- State synchronization challenges

#### Effort: 4-6 weeks | Risk: **High**

### Option 4: Plugin Architecture with Dynamic Loading

**Description**: Tools are loaded as plugins at runtime from npm packages or local directories. The app discovers and loads plugins without code changes.

#### Pros
- Extensible without code changes
- Community can contribute plugins
- Tools independently versioned
- Easy to enable/disable tools

#### Cons
- Security concerns (untrusted plugins)
- Versioning challenges
- Loading complexity
- Debugging is harder

#### Effort: 3-4 weeks | Risk: **Medium-High**

---

## Abstraction Strategy

### Layer 1: Tool Spawning Abstraction

**Current Problem**: Hardcoded `npx @anthropic-ai/claude-code` in ProcessManager

**Solution**:

```typescript
// backend/src/providers/IToolProvider.ts
interface IToolProvider {
  // Spawning (CLI-based tools)
  spawnProcess(options: SpawnOptions): Promise<ProcessHandle>;

  // SDK-based tools
  createClient(): Promise<any>;

  // MCP-based tools
  connectMCP(server: MCPServerConfig): Promise<MCPServer>;
}

interface SpawnOptions {
  cwd: string;
  env?: Record<string, string>;
  flags?: string[];
  timeout?: number;
}
```

**Concrete Implementation for Claude**:

```typescript
// backend/src/providers/ClaudeProvider.ts
class ClaudeProvider implements IToolProvider {
  readonly id = 'claude';
  readonly name = 'claude';
  readonly displayName = 'Claude Code';

  async spawnProcess(options: SpawnOptions): Promise<ProcessHandle> {
    const args = [
      'npx', '-y', '@anthropic-ai/claude-code@latest',
      '--cwd', options.cwd,
      '--output-format=stream-json',
      ...options.flags
    ];

    const process = spawn('npx', args, {
      env: { ...process.env, ...options.env }
    });

    return {
      pid: process.pid,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
      kill: () => process.kill()
    };
  }
}
```

### Layer 2: Stream/Message Parsing Abstraction

**Current Problem**: Claude-specific JSON format hardcoded in StreamProcessor

**Solution**:

```typescript
// backend/src/parsers/ISessionStreamParser.ts
interface ISessionStreamParser {
  parse(chunk: Buffer): StreamEvent[];
  reset(): void;
  getExpectedFormat(): StreamFormat;
}
```

**Claude-Specific Parser**:

```typescript
// backend/src/parsers/ClaudeStreamParser.ts
class ClaudeStreamParser implements ISessionStreamParser {
  private buffer = '';

  parse(chunk: Buffer): StreamEvent[] {
    this.buffer += chunk.toString();
    const events: StreamEvent[] = [];

    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const json = JSON.parse(line);
          events.push(this.mapClaudeEvent(json));
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    return events;
  }

  private mapClaudeEvent(json: any): StreamEvent {
    switch (json.type) {
      case 'delta':
        return {
          type: 'delta',
          role: 'assistant',
          content: json.delta?.text || json.content,
          timestamp: new Date()
        };
      case 'message':
        return {
          type: 'message',
          role: json.role,
          content: json.content,
          timestamp: new Date()
        };
      case 'tool_use':
        return {
          type: 'tool_call',
          role: 'assistant',
          content: json.input,
          metadata: { toolName: json.name, toolId: json.id },
          timestamp: new Date()
        };
    }
  }

  reset() {
    this.buffer = '';
  }
}
```

### Layer 3: Configuration Abstraction

**Current Problem**: CLAUDE_EXECUTABLE, claude_agents_path hardcoded

**Solution**:

```typescript
// backend/src/config/provider.config.ts
interface ProviderConfig {
  claude?: {
    executable?: string;
    timeout?: number;
    flags?: string[];
    agentsPath?: string;
  };
  opencode?: {
    apiKey?: string;
    baseUrl?: string;
  };
  cursor?: {
    mcpCommand?: string;
    mcpArgs?: string[];
  };
  [key: string]: any;
}

class ProviderConfigManager {
  static async load(): Promise<ProviderConfig> {
    const envConfig = this.loadFromEnv();
    const dbConfig = await this.loadFromDatabase();

    return {
      ...envConfig,
      ...dbConfig
    };
  }

  private static loadFromEnv(): Partial<ProviderConfig> {
    return {
      claude: {
        executable: process.env.CLAUDE_EXECUTABLE || 'claude',
        timeout: parseInt(process.env.CLAUDE_TIMEOUT || '300000'),
        flags: (process.env.CLAUDE_FLAGS || '').split(',').filter(Boolean)
      },
      opencode: {
        apiKey: process.env.OPENCODE_API_KEY,
        baseUrl: process.env.OPENCODE_BASE_URL
      },
      cursor: {
        mcpCommand: process.env.CURSOR_MCP_COMMAND,
        mcpArgs: JSON.parse(process.env.CURSOR_MCP_ARGS || '[]')
      }
    };
  }
}
```

### Layer 4: Database Schema Changes

**Migration SQL**:

```sql
-- Migration: 001_add_provider_support.sql

-- Add tool_type to sessions
ALTER TABLE sessions ADD COLUMN tool_type VARCHAR(50) DEFAULT 'claude' NOT NULL;
CREATE INDEX idx_sessions_tool_type ON sessions(tool_type);

-- Rename claude-specific columns to generic
ALTER TABLE sessions RENAME COLUMN claude_session_id TO tool_session_id;
ALTER TABLE sessions ADD COLUMN tool_session_data JSON;

-- Add new config keys
INSERT INTO system_config (key, value) VALUES
  ('opencode_api_key', '""'),
  ('opencode_base_url', '"https://api.opencode.ai"'),
  ('cursor_mcp_command', '"node"'),
  ('cursor_mcp_args', '["~/.config/opencode/cursor-mcp-server.js"]');

-- Backfill existing sessions
UPDATE sessions SET tool_type = 'claude' WHERE tool_type IS NULL OR tool_type = '';
```

**Updated Types**:

```typescript
// backend/src/types/session.types.ts
export enum ToolType {
  CLAUDE = 'claude',
  OPENCODE = 'opencode',
  CURSOR = 'cursor'
}

export interface Session {
  id: string;
  userId: string;
  projectId: string;
  toolType: ToolType;  // NEW: was claude-specific
  toolSessionId: string;  // RENAMED: was claudeSessionId
  toolSessionData?: Record<string, any>;  // NEW
  createdAt: Date;
}
```

### Layer 5: UI/Branding Abstraction

```typescript
// frontend/src/config/toolBranding.ts
export const TOOL_BRANDING: Record<ToolType, ToolBranding> = {
  claude: {
    name: 'Claude Code',
    displayName: 'Claude',
    logo: '/logos/claude.svg',
    primaryColor: '#D97706',
    agentLabel: 'Claude Agents',
    agentPathPlaceholder: '~/.claude/agents/'
  },
  opencode: {
    name: 'OpenCode',
    displayName: 'OpenCode',
    logo: '/logos/opencode.svg',
    primaryColor: '#6366F1',
    agentLabel: 'OpenCode Plugins',
    agentPathPlaceholder: '~/.config/opencode/plugins/'
  },
  cursor: {
    name: 'Cursor',
    displayName: 'Cursor',
    logo: '/logos/cursor.svg',
    primaryColor: '#007ACC',
    agentLabel: 'MCP Servers',
    agentPathPlaceholder: '~/.cursor/mcp-servers/'
  }
};
```

---

## Migration Path

### Phase 1: Foundation (Week 1-2)

**Goal**: Create abstraction layer without changing existing Claude functionality

**Tasks**:
1. ✅ Create IToolProvider interface and base classes
2. ✅ Implement ClaudeProvider (extract existing ProcessManager logic)
3. ✅ Create ProviderFactory
4. ✅ Add tool_type column to database (migration)
5. ✅ Update SessionService to use ProviderFactory
6. ✅ Update frontend types for toolType field

**File Changes**:
```
NEW FILES:
- backend/src/providers/IToolProvider.ts (100 lines)
- backend/src/providers/ClaudeProvider.ts (200 lines)
- backend/src/providers/ProviderFactory.ts (50 lines)
- backend/src/types/provider.types.ts (80 lines)

MODIFIED FILES:
- backend/src/services/SessionService.ts (+40 lines)
- backend/src/services/ProcessManager.ts (refactor, -100 lines)
- backend/src/types/session.types.ts (+5 lines)
- backend/src/database/database.ts (+10 lines)
- backend/src/config/env.config.ts (+30 lines)
- frontend/src/types/session.types.ts (+5 lines)
```

**Testing**:
```bash
bun test backend/src/providers/ClaudeProvider.test.ts
bun test frontend/src/components/SessionList.test.tsx
bun run migrate:up
```

**Backward Compatibility**: ✅ Existing sessions continue to work with `tool_type='claude'` default

---

### Phase 2: OpenCode Integration (Week 3-4)

**Goal**: Add OpenCode as second tool option

**Tasks**:
1. ✅ Implement OpenCodeProvider using @opencode-ai/sdk
2. ✅ Implement OpenCodeStreamParser
3. ✅ Add OpenCode configuration to env.config.ts
4. ✅ Add ToolSelector component to frontend
5. ✅ Update SessionService to support tool switching
6. ✅ Add OpenCode-specific tests

**File Changes**:
```
NEW FILES:
- backend/src/providers/OpenCodeProvider.ts (150 lines)
- backend/src/parsers/OpenCodeStreamParser.ts (100 lines)
- frontend/src/components/ToolSelector.tsx (80 lines)

MODIFIED FILES:
- backend/src/config/env.config.ts (+20 lines)
- backend/src/services/SessionService.ts (+20 lines)
- frontend/src/pages/SessionListPage.tsx (+20 lines)
```

**Testing**:
```bash
OPENCODE_API_KEY=test bun test backend/src/providers/OpenCodeProvider.test.ts
bun test:e2e scenarios/multi-tool-switch.feature
```

**Rollback Plan**: Disable OpenCode via config if issues arise

---

### Phase 3: Cursor Integration (Week 5-6)

**Goal**: Add Cursor via MCP

**Tasks**:
1. ✅ Implement CursorProvider with MCP client
2. ✅ Implement MCP server integration
3. ✅ Add Cursor configuration
4. ✅ Update ToolSelector
5. ✅ Add MCP-specific error handling

**File Changes**:
```
NEW FILES:
- backend/src/providers/CursorProvider.ts (120 lines)
- backend/src/parsers/MCPServerParser.ts (80 lines)

MODIFIED FILES:
- backend/src/config/env.config.ts (+15 lines)
- frontend/src/config/toolBranding.ts (+15 lines)
```

**Testing**:
```bash
CURSOR_MCP_COMMAND=test-server bun test backend/src/providers/CursorProvider.test.ts
bun test:e2e scenarios/cursor-mcp.feature
```

**Rollback Plan**: MCP servers can be disabled without affecting other tools

---

### Phase 4: Additional Tools (Week 7-8)

**Goal**: Add KiloCode, Codex (if APIs available)

**Note**: ⚠️ Research incomplete - need to verify APIs before implementation

**Tasks**:
1. 🔍 Research KiloCode/Codex APIs
2. 🔍 Document tool capabilities
3. 📝 Implement providers
4. 📝 Add configurations
5. 📝 Update UI
6. 📝 Add tests

---

### Phase 5: Refinement (Week 9-10)

**Goal**: Polish and optimize

**Tasks**:
1. 🚀 Performance optimization (connection pooling, caching)
2. 🐛 Error handling improvements
3. 📚 Documentation updates
4. 📖 User guide for multi-tool setup
5. 📊 Monitoring and logging

---

## Tool-Specific Considerations

### Claude Code

**Integration Approach**: CLI spawning (existing)

**Unique Capabilities**:
- ✅ Resume/continue sessions
- ✅ Agent system (`.md` files)
- ✅ Rich tool set (read, bash, grep, glob, edit, write)
- ✅ Permission system

**Known Limitations**:
- ❌ Requires CLI installation
- ❌ No official SDK
- ⚠️ Process overhead

**Example**:
```typescript
const claude = new ClaudeProvider();
await claude.initialize(config);
const session = await claude.createSession({ cwd: '/project' });
```

---

### OpenCode

**Integration Approach**: @opencode-ai/sdk

**Unique Capabilities**:
- ✅ Event-driven architecture (20+ event hooks)
- ✅ Plugin system for extensions
- ✅ Built-in session management API
- ✅ File watcher integration
- ✅ Permission hooks

**Known Limitations**:
- ⚠️ Context window management (67k tokens for tools)
- ⚠️ Plugin loading order sensitivity

**Example**:
```typescript
import { createOpencode } from "@opencode-ai/sdk";

const { client } = await createOpencode({
  apiKey: process.env.OPENCODE_API_KEY
});

// Create session
const session = await client.session.create({
  body: { title: "Kanban Session" }
});

// Subscribe to events
const events = await client.event.subscribe();
for await (const event of events.stream) {
  if (event.type === 'message.part.updated') {
    handleStreamEvent(event);
  }
}

// Execute prompt
await client.session.prompt({
  path: { id: session.id },
  body: { parts: [{ type: "text", text: input }] }
});
```

---

### KiloCode

**Integration Approach**: ⚠️ **Research Required**

**Status**: 🔍 Incomplete - needs investigation

**Placeholder Implementation**:
```typescript
class KiloCodeProvider implements IToolProvider {
  readonly id = 'kilocode';
  readonly name = 'KiloCode';

  async spawnProcess(options: SpawnOptions): Promise<ProcessHandle> {
    // PLACEHOLDER: Verify actual CLI command
    const process = spawn('kilocode', [
      '--cwd', options.cwd,
      ...options.flags
    ]);
    return processHandleFromProcess(process);
  }
}
```

**Action Items**:
1. Search for official KiloCode documentation
2. Check for SDK availability
3. Evaluate CLI compatibility
4. Test integration prototype

---

### Codex

**Integration Approach**: ⚠️ **Research Required**

**Status**: 🔍 Incomplete - needs clarification on which "Codex"

**Assumption**: May refer to OpenAI Codex, GitHub Copilot, or another tool

**Placeholder Implementation**:
```typescript
class CodexProvider implements IToolProvider {
  readonly id = 'codex';
  readonly name = 'Codex';

  async createClient(): Promise<any> {
    // PLACEHOLDER: Verify actual API
    return new OpenAI({ apiKey: this.config.apiKey });
  }

  async *execute(input: string): AsyncIterable<StreamEvent> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-codex',
      messages: [{ role: 'user', content: input }],
      stream: true
    });

    for await (const chunk of response) {
      yield {
        type: 'delta',
        content: chunk.choices[0]?.delta?.content || '',
        timestamp: new Date()
      };
    }
  }
}
```

**Action Items**:
1. Clarify which Codex tool (OpenAI, GitHub Copilot, other)
2. Check for official APIs/SDKs
3. Evaluate integration feasibility
4. Document findings

---

### Cursor

**Integration Approach**: Model Context Protocol (MCP)

**Unique Capabilities**:
- ✅ Native MCP support
- ✅ VS Code extension compatibility
- ✅ Cursor commands system
- ✅ Project-specific rules

**Known Limitations**:
- ⚠️ MCP servers communicate via stdio (requires careful error handling)
- ⚠️ Stateless servers (need external storage)
- ⚠️ Tool descriptions critical for AI understanding

**Example**:
```typescript
import { MCPServer } from '@opencode/mcp';

const mcpClient = new MCPServer({
  command: 'node',
  args: ['~/.config/opencode/cursor-mcp-server.js']
});

await mcpClient.connect();

// Call MCP tool
const result = await mcpClient.callTool('get_tasks', {
  session_id: sessionId
});

// Stream response
for await (const event of mcpClient.subscribe('stream_events')) {
  if (event.session_id === sessionId) {
    handleStreamEvent(event);
  }
}
```

---

## Decision Framework

### Option Comparison Matrix

| Criterion | Option 1: Provider Interface | Option 2: Strategy Pattern | Option 3: Microservices | Option 4: Plugin Architecture |
|------------|----------------------------|---------------------------|------------------------|---------------------------|
| **Development Time** | 2-3 weeks | 2-3 weeks | 4-6 weeks | 3-4 weeks |
| **Complexity** | Low-Medium | Medium-High | High | Medium-High |
| **Maintainability** | High | Medium | Low | High |
| **Testability** | High | Medium | Low | Medium |
| **Scalability** | Medium | Medium | High | High |
| **Extensibility** | Medium | High | High | Very High |
| **Performance** | Low overhead | Medium overhead | Network latency | Loading overhead |
| **Team Skill Required** | Medium | High | High | High |
| **Risk Level** | Medium | High | High | Medium-High |
| **Backward Compatibility** | Excellent | Good | Requires migration | Good |
| **Learning Curve** | Low | Medium | High | Medium |
| **Infrastructure Cost** | Low | Low | High | Low-Medium |

### Recommendation by Scenario

**Scenario 1: Small Team (1-2 developers), 2-3 month timeline**

→ **Option 1: Provider Interface Pattern** ✅
- Lowest complexity
- Fastest implementation
- Easy to maintain
- Low risk

---

**Scenario 2: Mid Team (3-5 developers), 4-6 month timeline, need flexibility**

→ **Option 2: Strategy Pattern** OR **Option 4: Plugin Architecture**
- Mix and match capabilities
- Future extensibility
- More complex but powerful

---

**Scenario 3: Large Team (5+ developers), 6+ month timeline, need scalability**

→ **Option 4: Plugin Architecture**
- Community can contribute
- Tools independently versioned
- Highest extensibility

---

**Scenario 4: Need independent deployment, multiple services already**

→ **Option 3: Microservice-Based**
- Independent scaling
- Language flexibility
- Better isolation

---

**Scenario 5: Quick PoC/MVP, limited resources**

→ **Option 1: Provider Interface Pattern** (simplified)
- Start with 2 tools (Claude + OpenCode)
- Extend later
- Prove value first

---

### Key Decision Factors

1. **Development Resources**
   - Low resources → Option 1
   - Medium resources → Option 2 or 4
   - High resources → Option 3 or 4

2. **Timeline Constraints**
   - <1 month → Option 1 (subset)
   - 1-2 months → Option 1
   - 3-6 months → Option 2 or 4
   - >6 months → Option 3 or 4

3. **Technical Requirements**
   - Real-time streaming → All options support ✅
   - Offline capability → Option 1 or 2 (local CLI)
   - Multi-tenant → Option 3 (isolated services)
   - Community contributions → Option 4 (plugins)

4. **Future Tool Support**
   - 1-2 additional tools → Option 1 or 2
   - 3-5 additional tools → Option 4
   - Unknown/many tools → Option 4

---

## Summary

### Recommended Approach: **Option 1 - Provider Interface Pattern**

**Key Benefits**:
1. ✅ Best balance of simplicity and extensibility
2. ✅ Low risk, proven pattern
3. ✅ Easy to implement incrementally
4. ✅ No infrastructure overhead
5. ✅ Testable in isolation
6. ✅ Clear migration path

**Suggested Path**:
1. Start with **Phase 1-2** (Claude + OpenCode)
2. Validate with users
3. Extend to Cursor and other tools
4. If future needs change (community plugins, rapid tool addition), refactor from Option 1 to Option 4 is straightforward

### Key Abstractions Needed

1. **Tool Spawning**: IToolProvider interface
2. **Stream Parsing**: ISessionStreamParser interface
3. **Configuration**: ProviderConfig with env + DB
4. **Database**: tool_type column, generic tool_session_id
5. **UI**: Tool branding configuration

### Success Criteria

The implementation enables:
- ✅ Pluggable tool architecture (add new tools without major refactoring)
- ✅ Multiple tools running concurrently or switching between them
- ✅ Tool-specific configuration and agent loading
- ✅ Unified user experience across all tools
- ✅ Clear migration path from current implementation

### Next Steps

1. ✅ **Review this plan** with stakeholders
2. ✅ **Choose implementation option** based on resources and timeline
3. ✅ **Create development branch** from main
4. ✅ **Begin Phase 1** (Foundation)
5. ✅ **Validate with existing Claude functionality**
6. ✅ **Proceed to Phase 2** (OpenCode integration)

---

**Document Version**: 1.0
**Last Updated**: 2025-02-12
**Status**: Ready for Implementation
