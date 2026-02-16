## Summary

This PR implements Phase 1 of the OpenCode + oh-my-opencode integration plan.

### Changes

**Database Schema Migration**
- Added `tool_type` column to sessions table (DEFAULT 'claude')
- Renamed `claude_session_id` → `tool_session_id`
- Added `tool_session_data` JSON column for provider-specific metadata
- Backfilled existing sessions with `tool_type = 'claude'`

**Type System Updates**
- Updated `Session` interface: `claudeSessionId` → `toolSessionId`
- Updated `SessionRepository`: All methods now use `toolSessionId`
- Renamed methods: `updateClaudeSessionId` → `updateToolSessionId`, `findByClaudeSessionId` → `findByToolSessionId`

**Environment Configuration**
- Created `backend/.env.example` with OpenCode environment variables
- Updated `env.config.ts`: Added `OpenCodeConfig` interface and parsing logic
  - `OPENCODE_EXECUTABLE`, `OPENCODE_CONFIG_DIR`, `OPENCODE_CONFIG`
  - `OPENCODE_MODEL`, `OH_MY_OPENCODE_ENABLED`

**Provider Registration**
- Created `OpenCodeProvider.ts` placeholder implementing `IToolProvider` interface
- Updated `providers/index.ts`: Registered OpenCodeProvider with ToolType.OPENCODE

**OpenCode + oh-my-opencode Verification**
- ✅ OpenCode 1.2.4 installed (meets ≥ 1.1.37 requirement)
- ✅ oh-my-opencode config exists at `~/.config/opencode/oh-my-opencode.json`
- ✅ Agents directory exists at `~/.config/opencode/agents/`
- ✅ All 7 oh-my-opencode agents configured (Sisyphus, Prometheus, Oracle, Librarian, Explore, Metis, Momus)

### Files Modified

- `backend/src/config/env.config.ts`
- `backend/src/providers/index.ts`
- `backend/src/providers/OpenCodeProvider.ts` (new)
- `backend/src/repositories/SessionRepository.ts`
- `backend/src/types/session.types.ts`
- `backend/src/types/provider.types.ts`
- `backend/.env.example` (new)

### Testing

- ✅ Database migration applied and verified
- ✅ Rollback procedure tested
- ✅ Data integrity confirmed
- ✅ All code references updated from `claudeSessionId` → `toolSessionId`

### Breaking Changes

- **SessionRepository API**: Method renamed `updateClaudeSessionId` → `updateToolSessionId`, `findByClaudeSessionId` → `findByToolSessionId`
- **Session type**: Field renamed `claudeSessionId` → `toolSessionId`

### Next Steps

Phase 2 will implement:
- OpenCodeProvider with actual opencode CLI spawning
- Stream processing for JSONL format
- Session management with oh-my-opencode agent orchestration
- Agent loading from `~/.config/opencode/agents/`

### Related Issues

- Implementation plan: `docs/OPENCODE_IMPLEMENTATION_PLAN_FINAL.md`
