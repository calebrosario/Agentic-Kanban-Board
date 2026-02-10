# Installation Guide

This guide will walk you through the installation process for Agentic Kanban Board.

## Prerequisites

### System Requirements

- **Operating System**:
  - Windows 10/11 (recommended and primary platform)
  - Linux (experimental support)
  - macOS (experimental support)

- **Software Requirements**:
  - **Node.js**: Version 18.0.0 or higher
  - **npm**: Comes with Node.js
  - **Claude Code CLI**: Latest version installed globally
  - **Git**: For cloning the repository

### Hardware Requirements

- **Minimum**:
  - CPU: Dual-core processor
  - RAM: 4GB
  - Disk Space: 500MB free space

- **Recommended**:
  - CPU: Quad-core processor or higher
  - RAM: 8GB or more
  - Disk Space: 1GB free space

## Step 1: Install Node.js

### Windows
1. Download the latest LTS version from [nodejs.org](https://nodejs.org/)
2. Run the installer with default settings
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### macOS
```bash
# Using Homebrew
brew install node
```

## Step 2: Install Claude Code CLI

Install Claude Code CLI globally:

```bash
npm install -g @anthropic-ai/claude-code
```

Verify installation:

```bash
claude --version
```

**Note**: You'll need to configure your Anthropic API key for Claude Code CLI to work properly.

## Step 3: Clone the Repository

```bash
git clone https://github.com/calebrosario/agentic-kanban-board.git
cd agentic-kanban-board
```

## Step 4: Install Dependencies

### Root Dependencies
```bash
npm install
```

### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

## Step 5: Configure Environment Variables

### Backend Configuration

1. Copy the environment example file:
   ```bash
   cp .env.example backend/.env
   ```

2. Edit `backend/.env` and set the following values:

   ```env
   # Backend Server
   PORT=3001
   NODE_ENV=development

   # Database
   DATABASE_PATH=./database/claude_code_board.db

   # WebSocket
   SOCKET_PORT=3001

   # Authentication (IMPORTANT: Change these in production!)
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin
   JWT_SECRET=your-jwt-secret-key-here-change-this

   # Logging
   LOG_LEVEL=info
   ```

3. **Security Note**: In production, you MUST change:
   - `ADMIN_USERNAME` from default `admin`
   - `ADMIN_PASSWORD` from default `admin`
   - `JWT_SECRET` to a secure random string

### Frontend Configuration

1. Copy the environment example file:
   ```bash
   cp .env.example frontend/.env
   ```

2. Edit `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_SOCKET_URL=http://localhost:3001
   ```

## Step 6: Start the Application

### Option 1: Using the Batch Script (Windows Only)

```bash
start.bat
```

This will automatically start both backend and frontend services.

### Option 2: Manual Startup

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## Step 7: Access the Application

1. Open your browser and navigate to:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3001 (for API testing)

2. Login with your configured credentials:
   - **Username**: (from `ADMIN_USERNAME` in backend/.env)
   - **Password**: (from `ADMIN_PASSWORD` in backend/.env)

## Step 8: Verify Installation

### Check Backend Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Check Frontend
1. Open http://localhost:5173 in your browser
2. You should see the login page
3. Login and verify the main dashboard loads

### Check WebSocket Connection
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by WS (WebSocket)
4. Refresh the page - you should see a WebSocket connection established

## Optional: Production Build

### Build Backend
```bash
cd backend
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Build Frontend
```bash
cd frontend
npm run build
```

This creates an optimized production build in the `frontend/dist/` directory.

### Run Production Build

```bash
# Backend
cd backend
npm start

# Frontend (serve static files)
cd frontend
npm run preview
```

## Troubleshooting

### Port Already in Use

If you see an error that port 3001 or 5173 is already in use:

**Windows:**
```bash
netstat -ano | findstr :3001
# Find the PID and kill it
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
lsof -ti:3001 | xargs kill -9
```

Alternatively, change the port in your `.env` files.

### Node Modules Issues

If you encounter issues with node_modules:

```bash
# Clear node_modules and package-lock.json
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

# Reinstall dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Database Issues

If you encounter database errors:

```bash
# Delete the existing database
rm backend/database/claude_code_board.db

# Restart the backend - it will create a fresh database
cd backend
npm run dev
```

### WebSocket Connection Failed

If the frontend can't connect to WebSocket:

1. Check if the backend is running
2. Verify `VITE_SOCKET_URL` in `frontend/.env` matches backend port
3. Check browser console for specific error messages
4. Ensure firewall isn't blocking the connection

## Next Steps

- [Configuration Guide](Configuration) - Learn how to configure the application
- [Usage Guide](Usage) - Learn how to use the application
- [API Reference](API-Reference) - Understand the API endpoints

## Uninstallation

To completely remove the application:

1. Stop all running processes (backend/frontend)
2. Delete the project directory:
   ```bash
   rm -rf agentic-kanban-board
   ```
3. (Optional) Uninstall Claude Code CLI:
   ```bash
   npm uninstall -g @anthropic-ai/claude-code
   ```

**Note**: This will also delete the SQLite database and all your session data. Backup your data before deleting if needed.
