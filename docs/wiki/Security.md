# Security

Important security information for Agentic Kanban Board.

## ⚠️ Critical Security Notice

**IMPORTANT: This application is designed for PERSONAL USE ONLY and is NOT suitable for online deployment without significant security enhancements.**

The application has **minimal security protections** beyond basic hardcoded authentication.

### Current Security Limitations

- ❌ **No encryption** for data transmission
- ❌ **No secure authentication system** (hardcoded credentials)
- ❌ **No input validation or sanitization** beyond basic checks
- ❌ **No protection against common web vulnerabilities** (XSS, CSRF, SQL injection)
- ❌ **No access control mechanisms** or role-based permissions
- ❌ **Database and file system** directly accessible
- ❌ **No audit logging** for sensitive operations
- ❌ **No rate limiting** on authentication attempts

## Security Best Practices

### For Personal Use

1. **Change Default Credentials**
   ```env
   # backend/.env - CHANGE THESE!
   ADMIN_USERNAME=your-secure-username
   ADMIN_PASSWORD=your-very-strong-password-123!
   JWT_SECRET=<generate-a-256-bit-random-string>
   ```

2. **Generate Secure JWT Secret**
   ```bash
   # Generate a secure 256-bit hex string
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Use Strong Passwords**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - No dictionary words or personal information

4. **Keep Application Updated**
   ```bash
   # Regularly update dependencies
   cd backend && npm update
   cd ../frontend && npm update
   ```

5. **Run on Local Network Only**
   - Do not expose to public internet
   - Use firewall to restrict access
   - Run on localhost only if possible

6. **Secure Your System**
   - Keep operating system updated
   - Use antivirus software
   - Enable system firewall
   - Regular security updates

### For Deployment (NOT RECOMMENDED)

⚠️ **If you MUST deploy this application, you MUST implement the following security measures:**

#### 1. Enable HTTPS/SSL

**Required** - Encrypt all data in transit.

```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

#### 2. Implement Multi-User Authentication

**Required** - Replace hardcoded credentials with proper user management.

```typescript
// Required authentication system
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
}

// Features needed:
- User registration
- Email verification
- Password reset (secure token-based)
- Account lockout after failed attempts
- Role-based access control (RBAC)
```

#### 3. Add CSRF Protection

**Required** - Prevent Cross-Site Request Forgery attacks.

```typescript
// Middleware example
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);

// Include CSRF token in all state-changing requests
app.post('/api/sessions', csrfProtection, (req, res) => {
  // Token is validated automatically
});

// Send token to frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

#### 4. Implement Rate Limiting

**Required** - Prevent brute force attacks.

```typescript
// Enhanced rate limiting
import rateLimit from 'express-rate-limit';

// Auth endpoints (strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later.',
});

// API endpoints (per user)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,
});

app.use('/api/auth', authLimiter);
app.use('/api', authenticate, apiLimiter);
```

#### 5. Add Input Validation & Sanitization

**Required** - Validate and sanitize all user inputs.

```typescript
// Using Zod for schema validation
import { z } from 'zod';
import { sanitize } from 'express-mongo-sanitize';

const sessionSchema = z.object({
  name: z.string()
    .min(3)
    .max(100)
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid characters'),
  workingDir: z.string()
    .max(255)
    .refine((val) => !val.includes('..'), 'Invalid path'),
  task: z.string()
    .max(10000)
    .transform((val) => sanitize(val)), // Sanitize HTML/script
});

app.post('/api/sessions', (req, res) => {
  const result = sessionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  // Process validated data
});
```

#### 6. Implement Content Security Policy (CSP)

**Required** - Prevent XSS attacks.

```typescript
// Using Helmet.js
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "ws:", "wss:"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}));
```

#### 7. Add XSS Protection

**Required** - Prevent cross-site scripting.

```typescript
import xss from 'xss';

// Sanitize all user-generated content
function sanitizeContent(content: string): string {
  return xss(content, {
    whiteList: {}, // No HTML allowed
    stripIgnoreTag: false,
  });
}

app.post('/api/messages', (req, res) => {
  const sanitizedContent = sanitizeContent(req.body.content);
  // Store sanitized content
});
```

#### 8. Implement SQL Injection Prevention

**Required** - Use parameterized queries.

```typescript
// ✅ Good - Parameterized query (Knex.js)
const sessions = await knex('sessions')
  .where('id', sessionId)
  .select();

// ❌ Bad - String concatenation (vulnerable)
const query = `SELECT * FROM sessions WHERE id = '${sessionId}'`;
const result = await db.raw(query);
```

#### 9. Add Audit Logging

**Required** - Log all sensitive operations.

```typescript
import { createLogger } from 'winston';

const auditLogger = createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'audit.log' }),
  ],
});

function logAudit(action: string, userId: string, details: any) {
  auditLogger.info({
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

// Usage
app.post('/api/sessions', (req, res) => {
  const session = await createSession(req.body);
  logAudit('SESSION_CREATED', req.user.id, { sessionId: session.id });
  res.json(session);
});
```

#### 10. Database Encryption

**Recommended** - Encrypt sensitive data at rest.

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const iv = crypto.randomBytes(16);

function encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

function decrypt(encrypted: string, ivHex: string, authTagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

## Vulnerability Assessment

### Known Vulnerabilities

Based on current implementation, the following vulnerabilities exist:

| Vulnerability | Severity | Status | Mitigation Required |
|---------------|-----------|--------|-------------------|
| Weak Authentication | **Critical** | ❌ Not fixed | Implement multi-user auth with MFA |
| No HTTPS | **High** | ❌ Not fixed | Enable TLS/SSL |
| No CSRF Protection | **High** | ❌ Not fixed | Implement CSRF tokens |
| No Input Validation | **High** | ❌ Not fixed | Add comprehensive validation |
| SQL Injection Risk | **Medium** | ⚠️ Partial | Use Knex.js parameterized queries |
| XSS Vulnerability | **High** | ❌ Not fixed | Sanitize all outputs |
| No Rate Limiting | **Medium** | ⚠️ Partial | Implement strict rate limiting |
| No Audit Logging | **Medium** | ❌ Not fixed | Add comprehensive logging |
| Hardcoded Secrets | **Critical** | ❌ Not fixed | Move to env vars, rotate regularly |

### Security Checklist

Before using this application, ensure:

- [ ] Default credentials changed
- [ ] JWT secret is strong and unique
- [ ] Running on local network only
- [ ] Firewall configured
- [ ] System is up to date
- [ ] Antivirus enabled
- [ ] No public internet exposure
- [ ] Regular backups configured
- [ ] Dependencies updated
- [ ] Monitoring configured

## Liability Disclaimer

**THE AUTHORS AND CONTRIBUTORS OF THIS PROJECT ACCEPT NO RESPONSIBILITY FOR ANY DAMAGES, LOSSES, OR SECURITY BREACHES THAT MAY OCCUR FROM USING THIS SOFTWARE.**

This includes but is not limited to:

- Loss of intellectual property or creative work
- Financial losses or damages
- Data breaches or unauthorized access
- System compromises or malware infections
- Any other direct or indirect damages

**BY USING THIS SOFTWARE, YOU ACKNOWLEDGE THAT:**

- You use it entirely at your own risk
- You understand the security limitations
- You will only use it on secure, personal computers
- You will not deploy it on public or shared networks without proper security measures
- You accept full responsibility for any consequences

## Security Reporting

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. **DO NOT** exploit the vulnerability
3. **DO** report privately via:
   - Email: security@example.com (replace with actual contact)
   - Private GitHub message to repository maintainers

**Include in your report:**

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

We will:
- Acknowledge receipt within 48 hours
- Provide regular updates on progress
- Fix the issue in a timely manner
- Credit you in the release notes

## Security Resources

### Learn More

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security](https://react.dev/learn/react-reference/react-dom/components/common#rendering-html)
- [Web Security Academy](https://portswigger.net/web-security)

### Tools

- [Snyk](https://snyk.io/) - Dependency vulnerability scanning
- [npm audit](https://docs.npmjs.com/cli/audit) - Built-in npm security
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [SQLMap](https://sqlmap.org/) - SQL injection testing

## Compliance

### Data Protection

- **GDPR**: Not compliant without significant modifications
- **CCPA**: Not compliant without significant modifications
- **HIPAA**: Not compliant without significant modifications

### Industry Standards

- **PCI DSS**: Not applicable (no payment processing)
- **SOC 2**: Not compliant
- **ISO 27001**: Not compliant

## Summary

⚠️ **This application is a development tool, NOT a production-ready application.**

### Current Status

- ✅ Functional for personal use on local networks
- ✅ Basic authentication (hardcoded credentials)
- ✅ SQLite database
- ✅ WebSocket real-time updates
- ❌ **NOT secure for online deployment**
- ❌ **NOT compliant with security standards**

### Recommended Use Cases

- ✅ Personal development on local machine
- ✅ Local network development with trusted team
- ✅ Prototyping and testing
- ❌ Production web deployment (without major security work)
- ❌ Public internet deployment (without major security work)
- ❌ Handling sensitive data (without encryption)
- ❌ Multi-user production environment

### Bottom Line

**Use this application at your own risk.** It is provided as-is without warranties or guarantees. The security limitations are significant and must be addressed before any form of online deployment.

---

**For more information:**
- [Installation](Installation)
- [Configuration](Configuration)
- [Architecture](Architecture)
- [Troubleshooting](Troubleshooting)
