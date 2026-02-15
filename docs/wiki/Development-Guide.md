# Development Guide

Guide for contributing to and developing Agentic Kanban Board.

## Prerequisites

### Required Software

- **Node.js**: 18.0.0 or higher
- **npm**: Comes with Node.js
- **Git**: For version control
- **Claude Code CLI**: For testing (optional but recommended)

### Development Tools

- **VS Code** or **WebStorm** (recommended)
- **Git** command line or GitKraken
- **Postman** or **Insomnia** (for API testing)
- **Browser DevTools** (Chrome/Firefox)

## Getting Started

### Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/agentic-kanban-board.git
cd agentic-kanban-board

# Add upstream remote
git remote add upstream https://github.com/calebrosario/agentic-kanban-board.git
```

### Install Dependencies

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### Development Environment Setup

1. **Create `.env` files:**
   ```bash
   # Backend
   cp .env.example backend/.env
   # Edit backend/.env with your settings

   # Frontend
   cp .env.example frontend/.env
   ```

2. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

3. **Access application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Project Structure

```
Agentic-Kanban-Board/
├── backend/                    # Backend application
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   │   └── env.config.ts # Environment variables
│   │   ├── controllers/       # Route controllers
│   │   │   ├── SessionController.ts
│   │   │   ├── WorkItemController.ts
│   │   │   └── ...
│   │   ├── database/          # Database setup
│   │   │   ├── migrations/    # Migration files
│   │   │   └── database.ts   # Database connection
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── repositories/      # Data access layer
│   │   │   ├── SessionRepository.ts
│   │   │   └── ...
│   │   ├── routes/            # API routes
│   │   │   ├── session.routes.ts
│   │   │   ├── workitem.routes.ts
│   │   │   └── ...
│   │   ├── services/          # Business logic
│   │   │   ├── ProcessManager.ts
│   │   │   ├── SessionService.ts
│   │   │   └── ...
│   │   ├── types/            # TypeScript types
│   │   │   └── index.ts
│   │   └── utils/            # Utility functions
│   │       └── logger.ts
│   ├── dist/                 # Compiled JavaScript
│   ├── database/             # SQLite database
│   └── package.json
├── frontend/                  # Frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Auth/       # Authentication components
│   │   │   ├── Common/     # Shared components
│   │   │   ├── Layout/     # Layout components
│   │   │   ├── Session/    # Session components
│   │   │   └── WorkItem/   # Work item components
│   │   ├── contexts/         # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── SessionsContext.tsx
│   │   │   └── I18nContext.tsx
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useWebSocket.ts
│   │   │   └── useNotifications.ts
│   │   ├── i18n/             # Internationalization
│   │   │   ├── locales/     # Translation files
│   │   │   │   ├── en/
│   │   │   │   ├── zh-CN/
│   │   │   │   └── ...
│   │   │   ├── config.ts
│   │   │   └── dateLocale.ts
│   │   ├── pages/            # Page components
│   │   │   ├── WorkflowStages.tsx
│   │   │   └── ...
│   │   ├── services/         # API services
│   │   │   └── api.ts
│   │   ├── stores/           # Zustand stores
│   │   │   ├── sessionStore.ts
│   │   │   ├── workItemStore.ts
│   │   │   └── ...
│   │   ├── types/            # TypeScript types
│   │   │   ├── session.types.ts
│   │   │   └── ...
│   │   ├── utils/            # Utility functions
│   │   ├── axiosInstance.ts
│   │   └── errorHandler.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/               # Static assets
│   └── package.json
├── docs/                    # Documentation
├── assets/                  # Shared assets
├── .env.example            # Environment template
├── package.json            # Root package.json
├── tsconfig.json          # TypeScript config
└── README.md             # Project README
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Use interfaces for data structures
- Use type aliases for union types
- Avoid `any` type
- Use `unknown` instead of `any` for untyped data

```typescript
// ✅ Good
interface User {
  id: string;
  username: string;
  email: string;
}

type Status = 'idle' | 'processing' | 'completed' | 'error';

function getUser(id: string): Promise<User> {
  // implementation
}

// ❌ Bad
const getUser = (id: any): any => {
  // implementation
};
```

### React Patterns

- Use functional components with hooks
- Use TypeScript for props
- Destructure props explicitly
- Use proper dependency arrays in useEffect
- Use useCallback for memoized functions
- Use useMemo for expensive computations

```typescript
// ✅ Good
interface Props {
  sessionId: string;
  onUpdate: (id: string, data: Partial<Session>) => void;
}

const SessionCard: React.FC<Props> = ({ sessionId, onUpdate }) => {
  const [session, setSession] = useState<Session | null>(null);

  const handleUpdate = useCallback((data: Partial<Session>) => {
    onUpdate(sessionId, data);
  }, [sessionId, onUpdate]);

  useEffect(() => {
    fetchSession(sessionId).then(setSession);
  }, [sessionId]);

  // render
};

// ❌ Bad
const SessionCard = (props: any) => {
  const session = props.session;

  useEffect(() => {
    fetchSession(session.id).then(setSession);
  }); // Missing dependency

  // render
};
```

### Naming Conventions

- **Files**: kebab-case (`session-card.tsx`, `api-client.ts`)
- **Components**: PascalCase (`SessionCard`, `APIError`)
- **Functions**: camelCase (`getUser`, `handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- **Interfaces**: PascalCase (`User`, `SessionConfig`)
- **Types**: PascalCase (`Status`, `Priority`)

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(session): add session filtering by status

Implement filtering in session list component to show
only sessions with specified status (processing, completed, etc.).

Closes #123
```

```
fix(auth): resolve token expiration issue

Fixed JWT token validation that was failing prematurely
due to incorrect timestamp comparison.

Fixes #456
```

## Backend Development

### Adding New API Endpoint

1. **Define repository method:**
   ```typescript
   // repositories/SessionRepository.ts
   export class SessionRepository {
     async getActiveSessions(): Promise<Session[]> {
       return await this.db('sessions')
         .where('status', '!=', 'completed')
         .select();
     }
   }
   ```

2. **Add service method:**
   ```typescript
   // services/SessionService.ts
   export class SessionService {
     constructor(private repo: SessionRepository) {}

     async getActiveSessions(): Promise<Session[]> {
       return await this.repo.getActiveSessions();
     }
   }
   ```

3. **Create controller:**
   ```typescript
   // controllers/SessionController.ts
   export class SessionController {
     constructor(private service: SessionService) {}

     async getActiveSessions(req: Request, res: Response): Promise<void> {
       try {
         const sessions = await this.service.getActiveSessions();
         res.json({ sessions });
       } catch (error) {
         res.status(500).json({ error: 'Failed to fetch sessions' });
       }
     }
   }
   ```

4. **Add route:**
   ```typescript
   // routes/session.routes.ts
   router.get('/active', sessionController.getActiveSessions.bind(sessionController));
   ```

### Adding Database Migration

```typescript
// database/migrations/YYYYMMDDHHMMSS_add_new_table.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('new_table', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('new_table');
}
```

Run migrations:
```bash
cd backend
npm run migrate  # Apply migrations
npm run migrate:rollback  # Rollback last migration
```

### Backend Testing

```bash
cd backend
npm test              # Run tests
npm run test:watch     # Run tests in watch mode
```

## Frontend Development

### Adding New Component

```typescript
// components/Common/NewComponent.tsx
import React from 'react';

interface Props {
  title: string;
  onClick: () => void;
}

export const NewComponent: React.FC<Props> = ({ title, onClick }) => {
  return (
    <button onClick={onClick}>
      {title}
    </button>
  );
};
```

### Adding New Page

```typescript
// pages/NewPage.tsx
import React from 'react';
import { Layout } from '../components/Layout/Layout';

export const NewPage: React.FC = () => {
  return (
    <Layout>
      <div>
        <h1>New Page</h1>
        {/* Page content */}
      </div>
    </Layout>
  );
};

// Add to router in App.tsx
<Route path="/new-page" element={<NewPage />} />
```

### Adding New State Store (Zustand)

```typescript
// stores/newStore.ts
import { create } from 'zustand';

interface NewStore {
  items: Item[];
  fetchItems: () => Promise<void>;
  addItem: (item: Item) => void;
}

export const useNewStore = create<NewStore>((set, get) => ({
  items: [],
  fetchItems: async () => {
    const response = await api.get('/items');
    set({ items: response.data });
  },
  addItem: (item) => {
    set({ items: [...get().items, item] });
  },
}));
```

### Frontend Testing

```bash
cd frontend
npm test              # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

## Internationalization

### Adding New Translations

1. **Add keys to English locale:**
   ```json
   // frontend/src/i18n/locales/en/common.json
   {
     "newFeature": {
       "title": "New Feature",
       "description": "Description of new feature"
     }
   }
   ```

2. **Translate to other languages:**
   ```json
   // frontend/src/i18n/locales/zh-TW/common.json
   {
     "newFeature": {
       "title": "新功能",
       "description": "新功能描述"
     }
   }
   ```

3. **Use in component:**
   ```typescript
   const { t } = useI18nContext();

   <h1>{t('newFeature.title')}</h1>
   <p>{t('newFeature.description')}</p>
   ```

### Adding New Language

1. Create new locale directory: `frontend/src/i18n/locales/xx/`
2. Copy all JSON files from `en/` directory
3. Translate all keys in each JSON file
4. Update `frontend/src/i18n/config.ts`:
   ```typescript
   export const languages = [
     { code: 'en', name: 'English', flag: '🇺🇸' },
     { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
     { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
     { code: 'es', name: 'Español', flag: '🇪🇸' },
     { code: 'ja', name: '日本語', flag: '🇯🇵' },
     { code: 'pt', name: 'Português', flag: '🇧🇷' },
     { code: 'xx', name: 'New Language', flag: '🏳️' },  // Add new language
   ];
   ```

## Building and Deployment

### Build Backend

```bash
cd backend
npm run build
# Output: dist/ directory
```

### Build Frontend

```bash
cd frontend
npm run build
# Output: dist/ directory
```

### Production Deployment

**Prerequisites:**
- Node.js 18+ on server
- PM2 or similar process manager (recommended)
- Nginx or Apache as reverse proxy (recommended)

**Backend:**
```bash
cd backend
npm install --production
npm run build
pm2 start dist/server.js --name "agentic-kanban-backend"
```

**Frontend:**
```bash
cd frontend
npm install --production
npm run build
# Serve static files with Nginx
# Or use: npm run preview
```

## Git Workflow

### Creating a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout master
git merge upstream/master

# Create feature branch
git checkout -b feature/your-feature-name
```

### Committing Changes

```bash
git add .
git commit -m "feat: add new feature"
```

### Pushing and Creating PR

```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

### Syncing with Upstream

```bash
git fetch upstream
git checkout master
git merge upstream/master
```

## Code Review Guidelines

### Before Submitting PR

- [ ] Code follows project style guidelines
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] New features include tests
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits
- [ ] No console.log or debugging code

### Review Checklist

- [ ] Code is readable and maintainable
- [ ] Proper error handling
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Internationalization included (if UI changes)

## Useful Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Socket.io Documentation](https://socket.io/docs/v4/)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Router v7](https://reactrouter.com)
- [i18next Documentation](https://www.i18next.com/)

### Best Practices
- [React Best Practices](https://reactpatterns.com/)
- [TypeScript Best Practices](https://basarat.gitbook.io/typescript/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Getting Help

### Community
- GitHub Issues: [Report bugs](https://github.com/calebrosario/agentic-kanban-board/issues)
- GitHub Discussions: [Ask questions](https://github.com/calebrosario/agentic-kanban-board/discussions)

### Documentation
- [API Reference](API-Reference)
- [Architecture](Architecture)
- [Troubleshooting](Troubleshooting)

---

Happy coding! 🚀
