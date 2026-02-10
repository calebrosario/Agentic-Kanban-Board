# Usage Guide

Learn how to use Agentic Kanban Board effectively.

## Getting Started

### Initial Setup

1. **Login** to the application using your configured credentials
2. **Configure** your Claude agents directory in Settings
3. **Create** your first project/work item
4. **Launch** your first session

### Interface Overview

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar                                           │
│  ├─ Sessions                                    │
│  ├─ Work Items                                  │
│  ├─ Workflow Stages                             │
│  ├─ Agent Prompts                              │
│  └─ Settings                                    │
├─────────────────────────────────────────────────────────┤
│  Main Content Area                                │
│  ├─ Session List (Left)                          │
│  │  ├─ Processing                               │
│  │  ├─ Idle                                    │
│  │  ├─ Completed                               │
│  │  └─ Error/Interrupted                       │
│  └─ Session Detail (Right)                      │
│     ├─ Message History                          │
│     └─ Message Input                           │
└─────────────────────────────────────────────────────────┘
```

## Creating Sessions

### Basic Session Creation

1. Click **"New Session"** button in the sidebar
2. Fill in the form:

   **Required Fields:**
   - **Name**: Descriptive name for your session (e.g., "Fix login bug")
   - **Working Directory**: Path to your project folder

   **Optional Fields:**
   - **Work Item**: Link to a project work item
   - **Workflow Stage**: Select a specialized workflow stage
   - **Agent**: Choose a Claude agent for specialized behavior

3. Click **"Create Session"**

### Quick Templates

Use pre-configured templates for common tasks:

- 🔍 **Code Review**: Review code for quality and issues
- 🐛 **Bug Fix**: Debug and fix reported bugs
- ✨ **Feature Development**: Implement new features
- 📝 **Documentation**: Write or update documentation

Templates auto-fill:
- Appropriate workflow stage
- Relevant agent
- Suggested task description

### Continuing from Previous Session

To build upon previous work:

1. Select a completed or interrupted session
2. Click **"Continue from this session"**
3. The new session will:
   - Inherit the working directory
   - Include previous conversation context
   - Use the same workflow stage and agent

## Managing Sessions

### Session Status

Sessions can have the following statuses:

| Status | Description | Actions |
|--------|-------------|---------|
| **Idle** | Session created but not started | Start, Edit, Delete |
| **Processing** | Claude Code CLI is running | Interrupt, Monitor |
| **Completed** | Session finished successfully | Continue, Delete, Export |
| **Error** | Session encountered an error | Retry, View Error, Delete |
| **Interrupted** | Session was manually stopped | Resume, Delete |

### Starting a Session

1. Find the session in the list
2. Click the **session card** or **"Open"** button
3. The session detail view opens
4. Type your first message and press **Enter** or click **"Send"**

### Sending Messages

**Basic Message:**
1. Type your message in the input box
2. Press **Enter** or click **"Send"**

**Multi-line Message:**
1. Type your message
2. Press **Shift + Enter** for new lines
3. Press **Enter** to send

**Continue Previous Message:**
1. Click **"Continue"** button in the message area
2. Claude will continue from the last response

### Interrupting a Session

When a session is running and you want to stop it:

1. Go to the session detail view
2. Click **"Interrupt"** button
3. Confirm the interruption
4. Session status changes to **"Interrupted"**

### Resuming an Interrupted Session

1. Find the interrupted session in the list
2. Click **"Resume"** button
3. The session continues from where it left off

### Deleting a Session

1. Find the session in the list
2. Click **"Delete"** button
3. Confirm deletion
4. ⚠️ This action **cannot be undone**

## Managing Work Items

### Creating a Work Item

1. Navigate to **"Work Items"** page
2. Click **"New Work Item"**
3. Fill in the form:

   **Required Fields:**
   - **Name**: Work item name (e.g., "Authentication Module")
   - **Status**: Planning, In Progress, Completed, Cancelled

   **Optional Fields:**
   - **Description**: Detailed description of the work item
   - **Priority**: High, Medium, Low
   - **Project**: Link to a project classification
   - **Working Directory**: Auto-inherited from project or manual
   - **Tags**: Add tags for organization

4. Click **"Save"**

### Organizing Sessions Under Work Items

When creating or editing a session:

1. Select the **"Work Item"** dropdown
2. Choose the appropriate work item
3. The session will appear under that work item
4. Work item session count updates automatically

### Viewing Work Item Details

1. Click on a work item card
2. View all associated sessions:
   - By status (Processing, Completed, etc.)
   - With filtering and sorting options
   - With session statistics

## Workflow Stages

### Understanding Workflow Stages

Workflow stages define specialized AI behavior for different development phases:

- **Code Review**: Focus on code quality and best practices
- **Debugging**: Focus on finding and fixing bugs
- **Feature Development**: Focus on implementing new functionality
- **Documentation**: Focus on writing clear documentation
- **Testing**: Focus on test coverage and quality
- **Security**: Focus on security vulnerabilities and fixes

### Creating a Workflow Stage

1. Navigate to **"Workflow Stages"** page
2. Click **"Add Stage"**
3. Configure:

   **Basic Settings:**
   - **Name**: Stage name (e.g., "Code Review")
   - **Description**: What this stage does
   - **Color**: Visual identifier (e.g., #3B82F6)

   **Prompt Configuration:**
   - **Prompt Source**: Choose between:
     - **Custom Prompt**: Write your own system prompt
     - **Use Agent**: Select from existing agents

   - **If Using Agent**:
     - Select an agent from dropdown
     - Agent file content will be used as system prompt

   - **If Using Custom Prompt**:
     - Write your system prompt in the textarea
     - Define AI behavior and role

   - **Suggested Tasks**: Add quick task templates (optional)

4. Click **"Save"**

### Using Workflow Stages

When creating a session:

1. Select a workflow stage from the dropdown
2. The session will use the stage's configuration:
   - Agent or custom prompt
   - Suggested tasks (for reference)
3. Claude's behavior will align with the selected stage

## Agent Prompts

### What are Agent Prompts?

Agent prompts are Markdown files containing instructions that define Claude's behavior for specific tasks. They are stored in `~/.claude/agents/` by default.

### Creating an Agent Prompt

1. Navigate to `~/.claude/agents/` directory
2. Create a new `.md` file (e.g., `security-auditor.md`)
3. Write your agent instructions:

   ```markdown
   # Security Auditor

   You are a security specialist focused on:
   - Identifying vulnerabilities
   - Recommending security best practices
   - Ensuring compliance with security standards

   ## Review Checklist

   1. Authentication & Authorization
   2. Input Validation
   3. Data Encryption
   4. Error Handling
   5. Logging & Monitoring

   ## Output Format

   Provide clear, actionable recommendations with:
   - Severity level (Critical, High, Medium, Low)
   - Explanation of the issue
   - Specific fix recommendations
   - Code examples where appropriate
   ```

4. Save the file
5. Refresh the application - the agent will be available

### Viewing Agent Prompts

1. Navigate to **"Agent Prompts"** page
2. View list of all available agents
3. Click on an agent to see:
   - Agent file content
   - Which workflow stages use this agent
   - When it was last updated

## Message Filtering

### Filtering Message Types

Control which message types are visible:

1. In the session detail view, click **"Filter"** button
2. Toggle visibility for:
   - **User Messages**: Your inputs
   - **Assistant Messages**: Claude's responses
   - **System Messages**: System notifications
   - **Tool Use**: When Claude uses tools
   - **Thinking Process**: Claude's internal reasoning (if enabled)
   - **Output Results**: Tool output
   - **Error Messages**: Error notifications

3. Click **"Show All"** or **"Hide All"** for quick control
4. Click **"Reset"** to restore defaults

### Using Message Filters

Filters help focus on specific aspects of a conversation:

- **Debug Mode**: Hide system messages, show only user/assistant
- **Tool Analysis**: Show only tool use and output
- **Review Mode**: Show all messages except thinking process

## Search and Organization

### Searching Sessions

1. Use the **search box** above the session list
2. Type to search by:
   - Session name
   - Work item name
   - Project name
   - Tags

### Sorting Sessions

Use the **sort selector** to order sessions by:
- **Created Date** (Newest/Oldest)
- **Updated Date** (Newest/Oldest)
- **Name** (A-Z/Z-A)
- **Status** (Processing first, etc.)

### Using Tags

Tags help organize and categorize sessions:

1. When creating/editing a session, add tags
2. Tags appear as colored badges on session cards
3. Click a tag to filter sessions by that tag

## Export and Backup

### Exporting Session History

1. Open a session detail view
2. Click **"Export"** button (usually in message area)
3. Choose export format:
   - **JSON**: Complete message history with metadata
   - **Markdown**: Human-readable conversation format

4. File downloads automatically

### Exporting All Sessions

1. Navigate to **Settings**
2. Find **"Export Data"** section
3. Click **"Export All Sessions"**
4. Choose format (JSON/Markdown)
5. All sessions exported to a zip file

### Database Backup

```bash
# Manual backup
cp backend/database/claude_code_board.db backups/backup_$(date +%Y%m%d).db

# Via Settings (if available)
# Navigate to Settings → Backup → Create Backup
```

## Notifications

### Desktop Notifications

Enable notifications for session events:

1. Navigate to **Settings**
2. Find **"Notifications"** section
3. Enable:
   - **Session Completed**: When a session finishes
   - **Session Error**: When an error occurs
   - **Session Interrupted**: When a session is stopped

### Sound Notifications

Configure sound alerts:

1. In **Settings**, find **"Sound"** section
2. Enable/disable sound notifications
3. Choose notification sound (if custom sounds available)

## Settings

### Common Configuration

Navigate to **Settings** to configure:

**Paths:**
- **Agents Directory**: Where Claude agent files are stored
- **Default Working Directory**: Pre-fill for new sessions
- **Common Paths**: Quick access to frequently used directories

**Appearance:**
- **Theme**: Light/Dark/System
- **Language**: Choose from 6 available languages
- **Font Size**: Adjust interface text size

**Session Defaults:**
- **Max Concurrent Sessions**: Limit simultaneous sessions
- **Auto-scroll**: Automatically scroll to new messages
- **Message Limit**: How many messages to load initially

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick create new session |
| `Ctrl/Cmd + /` | Focus search box |
| `Ctrl/Cmd + N` | Next session |
| `Ctrl/Cmd + P` | Previous session |
| `Ctrl/Cmd + Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Escape` | Close modal/dialog |
| `Ctrl/Cmd + ,` | Open settings |

## Tips and Best Practices

### Session Organization

1. **Use Descriptive Names**: "Fix login validation" vs "Fix bug"
2. **Link to Work Items**: Organize sessions under projects
3. **Use Tags**: Categorize sessions for easy filtering
4. **Set Appropriate Workflow Stages**: Choose stages that match the task

### Agent Usage

1. **Create Specialized Agents**: One agent per domain (security, UI, backend)
2. **Define Clear Instructions**: Be specific about behavior and output format
3. **Test Agents**: Create test sessions to verify agent behavior
4. **Iterate**: Improve agents based on real usage

### Workflow Stages

1. **Map to Your Process**: Create stages matching your development workflow
2. **Use Colors**: Visual distinction for quick identification
3. **Add Suggested Tasks**: Help teams start with appropriate prompts
4. **Combine with Agents**: Pair stages with relevant agents

### Performance

1. **Limit Concurrent Sessions**: Too many simultaneous sessions can slow down your system
2. **Use Message Filtering**: Hide unnecessary message types for better performance
3. **Archive Old Sessions**: Delete or export completed sessions to keep database small

### Troubleshooting

**Session not responding:**
1. Check if Claude Code CLI is installed correctly
2. Verify working directory exists and is accessible
3. Check WebSocket connection status (top of screen)
4. Try interrupting and resuming the session

**Agent not found:**
1. Verify agent file exists in configured directory
2. Check file permissions
3. Ensure file is `.md` format
4. Refresh the application

**WebSocket disconnected:**
1. Check if backend is running
2. Verify `VITE_SOCKET_URL` in frontend/.env
3. Check network connection
4. Try refreshing the page

---

## Next Steps

- [Configuration Guide](Configuration) - Advanced configuration options
- [API Reference](API-Reference) - API documentation for developers
- [Troubleshooting](Troubleshooting) - Common issues and solutions
- [Development Guide](Development-Guide) - Contribute to the project
