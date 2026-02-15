# Configuration Guide

This guide covers all configuration options for Agentic Kanban Board.

## Environment Variables

### Backend Configuration

Create or edit `backend/.env`:

```env
# ========== Server Configuration ==========
# Port for backend API server
PORT=3001

# Node environment (development | production | test)
NODE_ENV=development

# ========== Database Configuration ==========
# Path to SQLite database file
DATABASE_PATH=./database/claude_code_board.db

# ========== WebSocket Configuration ==========
# Port for WebSocket server (usually same as PORT)
SOCKET_PORT=3001

# ========== Authentication Configuration ==========
# Admin username for web interface
ADMIN_USERNAME=admin

# Admin password for web interface (CHANGE IN PRODUCTION!)
ADMIN_PASSWORD=admin

# Secret key for JWT token signing (CHANGE IN PRODUCTION!)
# Generate a secure random string with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-jwt-secret-key-here

# ========== Logging Configuration ==========
# Log level (error | warn | info | debug)
LOG_LEVEL=info

# ========== Claude Code CLI Configuration ==========
# Path to Claude Code CLI executable (optional, default: 'claude')
CLAUDE_CLI_PATH=claude

# Path to Claude agents directory (optional, default: ~/.claude/agents/)
AGENTS_PATH=~/.claude/agents/

# ========== Notification Configuration ==========
# Enable desktop notifications (true | false)
ENABLE_NOTIFICATIONS=true

# Sound file path for session completion notifications
# Relative to backend directory
NOTIFICATION_SOUND=./assets/notification.mp3

# ========== Process Management Configuration ==========
# Maximum number of concurrent sessions
MAX_CONCURRENT_SESSIONS=10

# Session timeout in seconds (0 = no timeout)
SESSION_TIMEOUT=0

# Process memory limit in MB (0 = no limit)
PROCESS_MEMORY_LIMIT=0

# ========== Rate Limiting Configuration ==========
# Enable API rate limiting (true | false)
ENABLE_RATE_LIMIT=true

# Rate limit window in milliseconds
RATE_LIMIT_WINDOW=60000

# Maximum requests per window
RATE_LIMIT_MAX=100
```

### Frontend Configuration

Create or edit `frontend/.env`:

```env
# ========== API Configuration ==========
# Backend API URL (for HTTP requests)
VITE_API_URL=http://localhost:3001

# WebSocket server URL (for real-time updates)
VITE_SOCKET_URL=http://localhost:3001

# ========== Application Configuration ==========
# Application title (displayed in browser tab)
VITE_APP_TITLE=Agentic Kanban Board

# Default language (en | zh-CN | zh-TW | es | ja | pt)
VITE_DEFAULT_LANGUAGE=en

# Enable debug mode (true | false)
VITE_DEBUG=false

# ========== UI Configuration ==========
# Number of messages to load initially
VITE_INITIAL_MESSAGE_COUNT=50

# Auto-scroll to bottom on new messages (true | false)
VITE_AUTO_SCROLL=true

# ========== Session Configuration ==========
# Default working directory path
VITE_DEFAULT_WORKING_DIR=

# Enable drag and drop (true | false)
VITE_ENABLE_DRAG_DROP=true

# ========== Theme Configuration ==========
# Default theme (light | dark | system)
VITE_DEFAULT_THEME=system

# Primary color (CSS color value)
VITE_PRIMARY_COLOR=#3B82F6
```

## Agent Configuration

### Setting Up Claude Agents

1. **Locate Agents Directory**:
   - Default: `~/.claude/agents/`
   - Or custom path from `AGENTS_PATH` environment variable

2. **Create Agent Files**:
   Each agent is a Markdown (`.md`) file with instructions:

   ```markdown
   # Code Reviewer

   You are a senior code reviewer specializing in:

   - Code quality assessment
   - Best practices verification
   - Security vulnerability detection
   - Performance optimization suggestions

   ## Review Process

   1. **Read and Understand**: Thoroughly analyze the code
   2. **Identify Issues**: Find bugs, security issues, anti-patterns
   3. **Suggest Improvements**: Provide actionable recommendations
   4. **Prioritize**: Mark issues as critical, major, or minor

   ## Output Format

   Provide reviews in this format:
   - **Summary**: Brief overview
   - **Critical Issues**: Must-fix items
   - **Major Issues**: Should-fix items
   - **Suggestions**: Nice-to-have improvements
   ```

3. **Directory Structure Example**:
   ```
   ~/.claude/agents/
   ├── code-reviewer.md      # Code review specialist
   ├── debugger.md           # Bug fixing expert
   ├── architect.md          # System design advisor
   ├── documenter.md        # Documentation writer
   ├── tester.md            # Testing specialist
   └── security-auditor.md  # Security reviewer
   ```

### Workflow Stage Configuration

Configure workflow stages in the web interface:

1. Navigate to **Workflow Stages** page
2. Click **Add Stage**
3. Configure:
   - **Name**: Stage name (e.g., "Code Review")
   - **Description**: What this stage does
   - **Prompt Source**: Custom prompt or Agent file
   - **Agent**: Select agent to use
   - **System Prompt**: Override agent instructions (optional)
   - **Suggested Tasks**: Quick task templates
   - **Color**: Visual identifier

## Project and WorkItem Configuration

### Creating Projects

1. Navigate to **Work Items** page
2. Click **New Work Item**
3. Configure:
   - **Name**: Project or task name
   - **Description**: Detailed description
   - **Status**: Planning, In Progress, Completed, Cancelled
   - **Priority**: High, Medium, Low
   - **Project**: Link to project classification
   - **Working Directory**: Auto-inherited or manual
   - **Tags**: Organize with custom tags

### Common Paths

1. Navigate to **Settings** → **Common Paths**
2. Add frequently used directories:
   - Project root directories
   - Common working directories
3. These appear as dropdown options when creating sessions

## Database Configuration

### SQLite Database

The application uses SQLite for data persistence. Default location: `backend/database/claude_code_board.db`

#### Database Tables:

- **users**: Authentication and user management
- **sessions**: Session metadata and configuration
- **work_items**: Project work items
- **workflow_stages**: Workflow stage definitions
- **agents**: Agent prompt configurations
- **projects**: Project classifications
- **tags**: Tag management
- **messages**: Session message history
- **common_paths**: Frequently used directories

#### Backup Database:

```bash
# Create backup
cp backend/database/claude_code_board.db backend/database/claude_code_board_backup_$(date +%Y%m%d).db

# Or automated backup
mkdir -p backups
cp backend/database/claude_code_board.db backups/backup_$(date +%Y%m%d_%H%M%S).db
```

#### Reset Database:

**⚠️ WARNING**: This deletes all data!

```bash
# Stop backend
rm backend/database/claude_code_board.db
# Restart backend - it will create fresh database
cd backend
npm run dev
```

## Authentication Configuration

### JWT Settings

Configure JWT token security in `backend/.env`:

```env
# Generate secure secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-256-bit-hex-secret-here

# Token expiration in seconds (default: 24 hours)
JWT_EXPIRES_IN=86400
```

### User Management

Currently, the application has a single admin user. To change credentials:

1. Edit `backend/.env`:
   ```env
   ADMIN_USERNAME=newusername
   ADMIN_PASSWORD=verysecurepassword123
   ```
2. Restart backend

**Note**: In production, consider implementing multi-user authentication and RBAC.

## Logging Configuration

### Log Levels

Set in `backend/.env`:

- **error**: Only errors and critical issues
- **warn**: Warnings and above
- **info**: General information (default)
- **debug**: Detailed debugging information

### Log Files

Logs are written to console and optionally to files. Location: `backend/logs/`

```
backend/logs/
├── combined.log    # All logs
├── error.log       # Error logs only
└── access.log     # HTTP request logs
```

## WebSocket Configuration

### Connection Settings

Frontend WebSocket connection is configured in `frontend/.env`:

```env
# WebSocket server URL
VITE_SOCKET_URL=http://localhost:3001

# Reconnection settings (in code)
- Connection timeout: 5000ms
- Reconnection attempts: Unlimited
- Reconnection delay: 1000ms (exponential backoff)
```

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe` | Client → Server | Subscribe to session updates |
| `unsubscribe` | Client → Server | Unsubscribe from session updates |
| `message` | Server → Client | New chat message |
| `status_update` | Server → Client | Session status change |
| `process_started` | Server → Client | Process started |
| `process_exit` | Server → Client | Process exited |
| `error` | Server → Client | Error notification |

## Performance Tuning

### Backend Performance

```env
# Increase concurrent sessions if needed
MAX_CONCURRENT_SESSIONS=20

# Enable rate limiting to prevent abuse
ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Process memory limit (MB) to prevent runaway processes
PROCESS_MEMORY_LIMIT=512
```

### Frontend Performance

```env
# Initial message load (reduce for faster initial load)
VITE_INITIAL_MESSAGE_COUNT=20

# Disable auto-scroll for better performance in long chats
VITE_AUTO_SCROLL=false
```

## Security Configuration

### Production Deployment

**⚠️ CRITICAL**: This application is designed for personal use only. Do NOT deploy to public networks without implementing:

1. **HTTPS/SSL**: Use reverse proxy with TLS
2. **Secure Authentication**: Multi-user authentication with RBAC
3. **Input Validation**: Sanitize all user inputs
4. **CSRF Protection**: Implement CSRF tokens
5. **Rate Limiting**: Enable API rate limiting
6. **Audit Logging**: Log all sensitive operations
7. **Database Encryption**: Encrypt sensitive data at rest
8. **Secure Headers**: Use helmet.js security headers

### Environment Variable Security

1. Never commit `.env` files to version control
2. Use environment variable management in production
3. Rotate JWT secrets regularly
4. Use strong, unique passwords

## Internationalization Configuration

### Supported Languages

- **en**: English
- **zh-CN**: 简体中文 (Simplified Chinese)
- **zh-TW**: 繁體中文 (Traditional Chinese)
- **es**: Español (Spanish)
- **ja**: 日本語 (Japanese)
- **pt**: Português (Portuguese)

### Adding New Languages

1. Create new locale directory: `frontend/src/i18n/locales/[lang]/`
2. Copy translation files from `en/` directory
3. Translate all JSON files:
   - `common.json`
   - `auth.json`
   - `sidebar.json`
   - `session.json`
   - `workflow.json`
   - `workitem.json`
4. Update `frontend/src/i18n/config.ts`:
   ```typescript
   export const languages = [
     { code: 'en', name: 'English', flag: '🇺🇸' },
     { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
     // Add new language
     { code: 'fr', name: 'Français', flag: '🇫🇷' },
   ];
   ```
5. Update date locale mapping in `frontend/src/i18n/dateLocale.ts`

## Troubleshooting Configuration Issues

### Environment Variables Not Loading

1. Check file is named `.env` (not `.env.txt`)
2. Ensure file is in correct directory (`backend/` or `frontend/`)
3. Restart application after changes
4. No spaces around `=` sign

### WebSocket Connection Failed

1. Verify `VITE_SOCKET_URL` matches backend port
2. Check backend is running and WebSocket server initialized
3. Test with: `wscat -c ws://localhost:3001`
4. Check firewall/network restrictions

### Agent Files Not Found

1. Verify `AGENTS_PATH` environment variable
2. Check file permissions on `.claude/agents/` directory
3. Ensure agent files are `.md` format
4. Restart backend after adding new agents

### Database Locked

```bash
# Check for stale database locks
ls -la backend/database/*.db-shm backend/database/*.db-wal

# If locks exist, stop backend and remove them
rm backend/database/*.db-shm backend/database/*.db-wal
```

## Next Steps

- [API Reference](API-Reference) - Learn about API endpoints
- [Usage Guide](Usage) - How to use the application
- [Security Guide](Security) - Security considerations and best practices
