# Troubleshooting

Common issues and their solutions.

## Installation Issues

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**

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

**Alternative:** Change the port in `backend/.env`:
```env
PORT=3002
SOCKET_PORT=3002
```

### Node Modules Installation Fails

**Error:** `npm ERR! network`, `ETIMEDOUT`, or `ENOTFOUND`

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Use npm mirror:**
   ```bash
   npm install --registry=https://registry.npmmirror.com
   ```

3. **Delete and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Claude Code CLI Not Found

**Error:** `claude: command not found` or `spawn claude ENOENT`

**Solution:**

1. Verify installation:
   ```bash
   claude --version
   ```

2. If not found, install globally:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. Check PATH environment variable:
   ```bash
   # View PATH
   echo $PATH  # Linux/macOS
   echo %PATH%  # Windows
   ```

## Connection Issues

### Backend Not Starting

**Error:** Backend fails to start or crashes immediately

**Solutions:**

1. **Check Node.js version:**
   ```bash
   node --version
   # Must be 18.0.0 or higher
   ```

2. **Check for syntax errors in .env:**
   ```bash
   # Verify file format
   cat backend/.env
   # No spaces around = sign
   # Proper quotes around values with spaces
   ```

3. **Check database permissions:**
   ```bash
   # Ensure database directory exists and is writable
   mkdir -p backend/database
   chmod 755 backend/database
   ```

4. **Check port availability:**
   ```bash
   # Windows
   netstat -ano | findstr :3001

   # Linux/macOS
   lsof -i :3001
   ```

### Frontend Cannot Connect to Backend

**Error:** Network errors, API calls failing, or WebSocket connection failed

**Solutions:**

1. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/health
   # Expected: {"status":"healthy","timestamp":"..."}
   ```

2. **Check frontend environment variables:**
   ```bash
   # frontend/.env
   VITE_API_URL=http://localhost:3001
   VITE_SOCKET_URL=http://localhost:3001
   ```

3. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

4. **Check CORS issues:**
   - Ensure backend CORS allows frontend origin
   - Check browser console for CORS errors

### WebSocket Connection Failed

**Error:** "WebSocket connection failed" or socket keeps disconnecting

**Solutions:**

1. **Verify backend WebSocket server is initialized:**
   - Check backend logs for "WebSocket server is ready"
   - Verify socket.io is properly mounted

2. **Test WebSocket connection directly:**
   ```bash
   # Using wscat (install: npm install -g wscat)
   wscat -c ws://localhost:3001
   ```

3. **Check for firewall blocking:**
   - Temporarily disable firewall to test
   - Add exception for port 3001

4. **Verify Socket.io versions match:**
   ```bash
   # Backend
   cat backend/package.json | grep socket.io

   # Frontend
   cat frontend/package.json | grep socket.io-client
   # Versions should be compatible
   ```

## Session Issues

### Session Won't Start

**Error:** Creating session succeeds but it never starts or remains in "idle" status

**Solutions:**

1. **Check working directory:**
   - Ensure directory exists
   - Verify it's accessible
   - Check file permissions

2. **Check Claude Code CLI:**
   ```bash
   # Test Claude CLI in the directory
   cd /path/to/working/directory
   claude --version
   ```

3. **Check ProcessManager logs:**
   - View backend console/logs
   - Look for errors during process spawning

4. **Verify agent configuration:**
   - If using an agent, verify the agent file exists
   - Check agent file path in workflow stage configuration

### Session Stuck at "Processing"

**Error:** Session shows "processing" status indefinitely with no output

**Solutions:**

1. **Interrupt the session:**
   - Click "Interrupt" button in session detail
   - Wait for status to change to "interrupted"

2. **Check if Claude API is accessible:**
   - Verify internet connection
   - Check Anthropic API status

3. **Review session configuration:**
   - Check task description for clarity
   - Verify working directory is correct

4. **Try a simpler task:**
   - Create a test session with a simple task
   - If it works, the original task might be too complex

### Session Interrupts Unexpectedly

**Error:** Session stops working without user intervention

**Solutions:**

1. **Check error logs:**
   - View session detail for error messages
   - Check backend logs for process errors

2. **Verify Claude CLI timeout:**
   - Complex tasks might timeout
   - Consider breaking down into smaller tasks

3. **Check system resources:**
   ```bash
   # Check memory usage
   top  # Linux/macOS
   taskmgr  # Windows
   ```

4. **Increase timeout (if configurable):**
   ```env
   # backend/.env
   SESSION_TIMEOUT=3600  # 1 hour in seconds
   ```

### No Messages Showing

**Error:** Session is running but no messages appear in the chat

**Solutions:**

1. **Check message filters:**
   - Click "Filter" button in session detail
   - Ensure "Assistant Messages" is enabled
   - Click "Show All" to reset filters

2. **Verify WebSocket subscription:**
   - Check browser DevTools → Network → WS
   - Should see subscription to session channel

3. **Clear message cache:**
   - Refresh the page
   - Session will reload from database

## Database Issues

### Database Locked

**Error:** `database is locked` or `SQLITE_BUSY`

**Solutions:**

1. **Stop backend**
2. **Remove lock files:**
   ```bash
   rm backend/database/*.db-shm backend/database/*.db-wal
   ```
3. **Restart backend**

### Database Corrupted

**Error:** `database disk image is malformed`

**Solutions:**

1. **Restore from backup:**
   ```bash
   cp backups/backup_20240101.db backend/database/claude_code_board.db
   ```

2. **If no backup, try SQLite recovery:**
   ```bash
   sqlite3 backend/database/claude_code_board.db "PRAGMA integrity_check;"
   sqlite3 backend/database/claude_code_board.db ".dump" | sqlite3 new_database.db
   mv new_database.db backend/database/claude_code_board.db
   ```

3. **Last resort - reset database:**
   ```bash
   # ⚠️ WARNING: Deletes all data
   rm backend/database/claude_code_board.db
   # Restart backend - creates fresh database
   ```

### Migration Failed

**Error:** Database migration errors on startup

**Solutions:**

1. **Check migration files:**
   - View `backend/database/migrations/`
   - Verify no syntax errors

2. **Rollback to previous migration:**
   ```bash
   # View migration history
   cd backend
   knex migrate:status
   # Rollback specific migration
   knex migrate:rollback
   ```

3. **Reset database:**
   ```bash
   # Delete and recreate
   rm backend/database/claude_code_board.db
   # Backend will run migrations on restart
   ```

## Authentication Issues

### Login Fails

**Error:** "Invalid credentials" or 401 Unauthorized

**Solutions:**

1. **Verify credentials:**
   ```bash
   # Check backend/.env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin
   ```

2. **Reset credentials if forgotten:**
   - Edit `backend/.env`
   - Set new `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   - Restart backend

3. **Clear localStorage:**
   - Open browser DevTools → Application → Local Storage
   - Delete all items
   - Refresh and login again

### Token Expired

**Error:** "Token expired" or 401 on API requests

**Solutions:**

1. **Logout and login again:**
   - Click logout in sidebar
   - Login with credentials
   - New token will be issued

2. **Increase token expiration:**
   ```env
   # backend/.env
   JWT_EXPIRES_IN=604800  # 7 days in seconds
   ```

## Performance Issues

### Application Slow

**Symptoms:** UI is sluggish, page loads slowly

**Solutions:**

1. **Reduce initial message load:**
   ```env
   # frontend/.env
   VITE_INITIAL_MESSAGE_COUNT=20  # Reduce from default 50
   ```

2. **Close unnecessary browser tabs**
3. **Disable browser extensions** temporarily
4. **Check database size:**
   ```bash
   ls -lh backend/database/claude_code_board.db
   # If > 100MB, consider archiving old sessions
   ```

### High Memory Usage

**Symptoms:** System becomes slow, high RAM consumption

**Solutions:**

1. **Limit concurrent sessions:**
   ```env
   # backend/.env
   MAX_CONCURRENT_SESSIONS=3  # Reduce from default 10
   ```

2. **Archive old sessions:**
   - Export completed sessions
   - Delete them from database

3. **Restart backend regularly:**
   ```bash
   # Stop and start to clear memory
   # Use process manager like PM2 for auto-restart
   ```

## Internationalization Issues

### Language Not Changing

**Symptoms:** Switching language doesn't update UI

**Solutions:**

1. **Clear browser cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

2. **Clear localStorage:**
   ```javascript
   // Browser console
   localStorage.clear()
   location.reload()
   ```

3. **Check translation files exist:**
   ```bash
   ls frontend/src/i18n/locales/
   # Should have: en, zh-CN, zh-TW, es, ja, pt directories
   ```

### Missing Translations

**Symptoms:** Some text remains in English or shows as translation keys

**Solutions:**

1. **Check translation files:**
   - Ensure all keys exist in the language file
   - Verify JSON syntax (no trailing commas)

2. **Report missing translations:**
   - Open issue on GitHub
   - Include: missing key, page location, screenshot

## Agent Issues

### Agent Not Loading

**Error:** "Agent not found" or agent instructions not being applied

**Solutions:**

1. **Verify agent directory:**
   ```bash
   # Check configured path
   cat backend/.env | grep AGENTS_PATH
   # Default: ~/.claude/agents/

   # List agents
   ls -la ~/.claude/agents/
   ```

2. **Check agent file format:**
   - Must be `.md` extension
   - Must contain valid Markdown

3. **Refresh application:**
   - Agent changes require application restart

### Agent Instructions Not Applied

**Symptoms:** Agent is selected but Claude doesn't follow instructions

**Solutions:**

1. **Verify agent content:**
   - Open agent file
   - Check for proper Markdown formatting
   - Ensure instructions are clear and specific

2. **Check workflow stage configuration:**
   - Verify agent is linked to the workflow stage
   - Check that prompt source is set to "Use Agent"

3. **Test with simple agent:**
   - Create a simple test agent
   - Use it in a test session
   - Verify it works

## Export/Import Issues

### Export Fails

**Error:** Export doesn't download or file is empty

**Solutions:**

1. **Check browser download settings:**
   - Ensure downloads are allowed
   - Check download folder

2. **Try different browser:**
   - Some browsers have restrictions on large file downloads

3. **Check console for errors:**
   - Open DevTools
   - Look for JavaScript errors during export

### Import Fails

**Error:** Cannot import exported data

**Solutions:**

1. **Verify file format:**
   - Ensure JSON structure is correct
   - Validate JSON syntax: https://jsonlint.com/

2. **Check file size:**
   - Large files might timeout
   - Consider splitting into smaller files

## Getting Help

### Before Reporting Issues

1. **Check this wiki** for similar issues
2. **Search existing issues** on GitHub
3. **Check system requirements**:
   - Node.js version >= 18.0.0
   - Claude Code CLI installed
   - Sufficient disk space and memory

### When Reporting Issues

Include the following information:

**System Information:**
- Operating System: Windows 10/11, Linux, macOS?
- Node.js version: `node --version`
- Application version: Check package.json

**Error Details:**
- Exact error message
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

**Logs:**
- Backend logs (console or log files)
- Browser console errors (DevTools)
- WebSocket connection status

### Useful Commands

```bash
# Check application health
curl http://localhost:3001/health

# View backend logs
tail -f backend/logs/combined.log

# Check database
sqlite3 backend/database/claude_code_board.db "SELECT * FROM sessions LIMIT 5;"

# Test WebSocket connection
wscat -c ws://localhost:3001

# Restart services (Windows)
start.bat

# Restart services (Linux/macOS)
cd backend && npm run dev &
cd frontend && npm run dev &
```

## Related Resources

- [Installation Guide](Installation) - Installation issues
- [Configuration](Configuration) - Configuration problems
- [API Reference](API-Reference) - API errors
- [Architecture](Architecture) - Understanding system behavior
- [Security](Security) - Security-related issues

---

Still having issues? [Open a GitHub issue](https://github.com/calebrosario/agentic-kanban-board/issues) with details.
