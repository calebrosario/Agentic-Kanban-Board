# API Reference

Complete API documentation for Agentic Kanban Board backend.

## Base URL

```
http://localhost:3001/api
```

## Authentication

All API endpoints (except `/api/auth`) require JWT authentication.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Login

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "Invalid credentials"
}
```

---

## Sessions API

### Get All Sessions

**Endpoint**: `GET /api/sessions`

**Query Parameters**:
- `status` (optional): Filter by status (`idle`, `processing`, `completed`, `error`)
- `workItemId` (optional): Filter by work item ID
- `projectId` (optional): Filter by project ID
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": "uuid-1",
      "name": "Fix authentication bug",
      "status": "processing",
      "workingDir": "/path/to/project",
      "workItemId": "uuid-2",
      "projectId": "uuid-3",
      "workflowStageId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z",
      "completedAt": null
    }
  ],
  "total": 1
}
```

### Get Session by ID

**Endpoint**: `GET /api/sessions/:id`

**Response** (200 OK):
```json
{
  "id": "uuid-1",
  "name": "Fix authentication bug",
  "status": "processing",
  "workingDir": "/path/to/project",
  "workItemId": "uuid-2",
  "projectId": "uuid-3",
  "workflowStageId": 1,
  "agent": {
    "id": 1,
    "name": "debugger",
    "path": "~/.claude/agents/debugger.md"
  },
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Fix the auth bug",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Session not found"
}
```

### Create Session

**Endpoint**: `POST /api/sessions`

**Request Body**:
```json
{
  "name": "Fix authentication bug",
  "workingDir": "/path/to/project",
  "workItemId": "uuid-2",
  "workflowStageId": 1,
  "task": "Fix the login form validation",
  "continueFromSessionId": "uuid-3",
  "dangerouslySkipPermissions": false
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-1",
  "name": "Fix authentication bug",
  "status": "idle",
  "workingDir": "/path/to/project",
  "workItemId": "uuid-2",
  "workflowStageId": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Validation failed",
  "details": {
    "name": "Name is required",
    "workingDir": "Working directory is required"
  }
}
```

### Update Session

**Endpoint**: `PUT /api/sessions/:id`

**Request Body**:
```json
{
  "name": "Updated session name",
  "status": "completed"
}
```

**Response** (200 OK):
```json
{
  "id": "uuid-1",
  "name": "Updated session name",
  "status": "completed",
  "updatedAt": "2024-01-01T02:00:00.000Z"
}
```

### Delete Session

**Endpoint**: `DELETE /api/sessions/:id`

**Response** (200 OK):
```json
{
  "message": "Session deleted successfully"
}
```

### Interrupt Session

**Endpoint**: `POST /api/sessions/:id/interrupt`

**Response** (200 OK):
```json
{
  "message": "Session interrupted",
  "status": "interrupted"
}
```

### Resume Session

**Endpoint**: `POST /api/sessions/:id/resume`

**Response** (200 OK):
```json
{
  "message": "Session resumed",
  "status": "processing"
}
```

### Send Message to Session

**Endpoint**: `POST /api/sessions/:id/message`

**Request Body**:
```json
{
  "content": "What is the current status?",
  "continue": false
}
```

**Response** (200 OK):
```json
{
  "message": "Message sent",
  "messageId": "msg-2"
}
```

---

## Work Items API

### Get All Work Items

**Endpoint**: `GET /api/work-items`

**Query Parameters**:
- `status` (optional): Filter by status
- `projectId` (optional): Filter by project ID
- `limit` (optional): Maximum results
- `offset` (optional): Pagination offset

**Response** (200 OK):
```json
{
  "workItems": [
    {
      "id": "uuid-1",
      "name": "Authentication Module",
      "description": "Implement OAuth2 authentication",
      "status": "in-progress",
      "priority": "high",
      "projectId": "uuid-2",
      "workingDir": "/path/to/project",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z",
      "sessionCount": 5
    }
  ],
  "total": 1
}
```

### Get Work Item by ID

**Endpoint**: `GET /api/work-items/:id`

**Response** (200 OK):
```json
{
  "id": "uuid-1",
  "name": "Authentication Module",
  "description": "Implement OAuth2 authentication",
  "status": "in-progress",
  "priority": "high",
  "projectId": "uuid-2",
  "workingDir": "/path/to/project",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z",
  "sessions": [
    {
      "id": "uuid-3",
      "name": "Fix login bug",
      "status": "completed"
    }
  ]
}
```

### Create Work Item

**Endpoint**: `POST /api/work-items`

**Request Body**:
```json
{
  "name": "Authentication Module",
  "description": "Implement OAuth2 authentication",
  "status": "planning",
  "priority": "high",
  "projectId": "uuid-2",
  "workingDir": "/path/to/project"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-1",
  "name": "Authentication Module",
  "status": "planning",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Update Work Item

**Endpoint**: `PUT /api/work-items/:id`

**Request Body**:
```json
{
  "name": "Updated name",
  "status": "completed"
}
```

**Response** (200 OK):
```json
{
  "id": "uuid-1",
  "name": "Updated name",
  "status": "completed",
  "updatedAt": "2024-01-01T02:00:00.000Z"
}
```

### Delete Work Item

**Endpoint**: `DELETE /api/work-items/:id`

**Response** (200 OK):
```json
{
  "message": "Work item deleted successfully"
}
```

---

## Workflow Stages API

### Get All Workflow Stages

**Endpoint**: `GET /api/workflow-stages`

**Response** (200 OK):
```json
{
  "stages": [
    {
      "id": 1,
      "name": "Code Review",
      "description": "Review code for quality and best practices",
      "promptType": "agent",
      "agentId": 1,
      "customPrompt": null,
      "color": "#3B82F6",
      "suggestedTasks": [
        "Review authentication module",
        "Check for security vulnerabilities"
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Workflow Stage by ID

**Endpoint**: `GET /api/workflow-stages/:id`

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Code Review",
  "description": "Review code for quality and best practices",
  "promptType": "agent",
  "agentId": 1,
  "agent": {
    "id": 1,
    "name": "code-reviewer",
    "path": "~/.claude/agents/code-reviewer.md"
  },
  "customPrompt": null,
  "color": "#3B82F6",
  "suggestedTasks": ["Review authentication module"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Create Workflow Stage

**Endpoint**: `POST /api/workflow-stages`

**Request Body**:
```json
{
  "name": "Code Review",
  "description": "Review code for quality and best practices",
  "promptType": "agent",
  "agentId": 1,
  "color": "#3B82F6",
  "suggestedTasks": [
    "Review authentication module",
    "Check for security vulnerabilities"
  ]
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "name": "Code Review",
  "promptType": "agent",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Update Workflow Stage

**Endpoint**: `PUT /api/workflow-stages/:id`

**Request Body**:
```json
{
  "name": "Updated Code Review",
  "description": "Updated description"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Updated Code Review",
  "updatedAt": "2024-01-01T02:00:00.000Z"
}
```

### Delete Workflow Stage

**Endpoint**: `DELETE /api/workflow-stages/:id`

**Response** (200 OK):
```json
{
  "message": "Workflow stage deleted successfully"
}
```

---

## Agents API

### Get All Agents

**Endpoint**: `GET /api/agent-prompts`

**Response** (200 OK):
```json
{
  "agents": [
    {
      "id": 1,
      "name": "code-reviewer",
      "path": "~/.claude/agents/code-reviewer.md",
      "content": "# Code Reviewer\n\nYou are a senior code reviewer...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Agent by Name

**Endpoint**: `GET /api/agent-prompts/:name`

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "code-reviewer",
  "path": "~/.claude/agents/code-reviewer.md",
  "content": "# Code Reviewer\n\nYou are a senior code reviewer...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

### Create Agent

**Endpoint**: `POST /api/agent-prompts`

**Request Body**:
```json
{
  "name": "code-reviewer",
  "path": "~/.claude/agents/code-reviewer.md",
  "content": "# Code Reviewer\n\nYou are a senior code reviewer..."
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "name": "code-reviewer",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Update Agent

**Endpoint**: `PUT /api/agent-prompts/:name`

**Request Body**:
```json
{
  "content": "# Updated Code Reviewer\n\nUpdated content..."
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "code-reviewer",
  "content": "# Updated Code Reviewer\n\nUpdated content...",
  "updatedAt": "2024-01-01T02:00:00.000Z"
}
```

### Delete Agent

**Endpoint**: `DELETE /api/agent-prompts/:name`

**Response** (200 OK):
```json
{
  "message": "Agent deleted successfully"
}
```

---

## Projects API

### Get All Projects

**Endpoint**: `GET /api/projects`

**Response** (200 OK):
```json
{
  "projects": [
    {
      "id": "uuid-1",
      "name": "E-commerce Platform",
      "description": "Online store project",
      "workingDir": "/path/to/ecommerce",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "workItemCount": 10,
      "sessionCount": 25
    }
  ]
}
```

### Create Project

**Endpoint**: `POST /api/projects`

**Request Body**:
```json
{
  "name": "E-commerce Platform",
  "description": "Online store project",
  "workingDir": "/path/to/ecommerce"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-1",
  "name": "E-commerce Platform",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Tags API

### Get All Tags

**Endpoint**: `GET /api/tags`

**Response** (200 OK):
```json
{
  "tags": [
    {
      "id": "uuid-1",
      "name": "frontend",
      "color": "#3B82F6",
      "sessionCount": 15
    },
    {
      "id": "uuid-2",
      "name": "backend",
      "color": "#10B981",
      "sessionCount": 10
    }
  ]
}
```

### Create Tag

**Endpoint**: `POST /api/tags`

**Request Body**:
```json
{
  "name": "frontend",
  "color": "#3B82F6"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-1",
  "name": "frontend",
  "color": "#3B82F6",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Task Templates API

### Get All Task Templates

**Endpoint**: `GET /api/task-templates`

**Response** (200 OK):
```json
{
  "templates": [
    {
      "id": "uuid-1",
      "name": "Code Review",
      "description": "Review code for quality and best practices",
      "workflowStageId": 1,
      "taskContent": "Review the following code:\n{code}",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Create Task Template

**Endpoint**: `POST /api/task-templates`

**Request Body**:
```json
{
  "name": "Code Review",
  "description": "Review code for quality and best practices",
  "workflowStageId": 1,
  "taskContent": "Review the following code:\n{code}"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-1",
  "name": "Code Review",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Common Paths API

### Get All Common Paths

**Endpoint**: `GET /api/common-paths`

**Response** (200 OK):
```json
{
  "paths": [
    {
      "id": "uuid-1",
      "path": "/Users/dev/projects",
      "name": "Main Projects",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "path": "/Users/dev/experiments",
      "name": "Experiments",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Create Common Path

**Endpoint**: `POST /api/common-paths`

**Request Body**:
```json
{
  "path": "/Users/dev/projects",
  "name": "Main Projects"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-1",
  "path": "/Users/dev/projects",
  "name": "Main Projects",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## WebSocket Events

### Client → Server Events

#### Subscribe to Session
```javascript
socket.emit('subscribe', sessionId);
```

#### Unsubscribe from Session
```javascript
socket.emit('unsubscribe', sessionId);
```

### Server → Client Events

#### New Message
```javascript
socket.on('message', (data) => {
  // data: { sessionId, type, content, timestamp }
});
```

#### Session Status Update
```javascript
socket.on('status_update', (data) => {
  // data: { sessionId, status, timestamp }
});
```

#### Process Started
```javascript
socket.on('process_started', (data) => {
  // data: { sessionId, pid }
});
```

#### Process Exited
```javascript
socket.on('process_exit', (data) => {
  // data: { sessionId, exitCode, signal }
});
```

#### Error Notification
```javascript
socket.on('error', (data) => {
  // data: { sessionId, error, errorType, details }
});
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation failed |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Backend is down |

## Rate Limiting

API requests are rate limited by default:

- **Window**: 60 seconds
- **Max Requests**: 100 per window

**Response Headers** (when rate limited):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 50
X-RateLimit-Reset: 1704067200
```

## Pagination

Most list endpoints support pagination:

- `limit`: Number of items per page (default: 50)
- `offset`: Number of items to skip (default: 0)

**Example**:
```
GET /api/sessions?limit=20&offset=40
```

This returns items 41-60.

## Filtering

Many endpoints support filtering by query parameters:

```
GET /api/sessions?status=completed&workItemId=uuid-123
```

---

## Next Steps

- [Usage Guide](Usage) - How to use the application
- [Configuration](Configuration) - Configuration options
- [Architecture](Architecture) - System architecture details
