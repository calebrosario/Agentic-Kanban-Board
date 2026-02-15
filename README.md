# Knowledge Base

Centralized documentation for agentic development workflows, architecture decisions, and operational knowledge.

## Quick Start

### Using Obsidian
1. Open Obsidian app
2. File → Open Vault
3. Select this folder (`~/KnowledgeBase`)
4. Enable community plugins (Settings → Community Plugins → Turn on)
5. Install recommended plugins:
   - **Git** - Auto-commit changes
   - **Templater** - Dynamic templates
   - **Dataview** - Query your notes

### Using CLI (obsidian-agent)

```bash
# Create an Architecture Decision Record
obsidian-agent create-adr "Use Redis for caching"

# Create a runbook
obsidian-agent create-runbook "Database Failover Procedure"

# Daily standup
obsidian-agent daily-standup

# Search knowledge base
obsidian-agent search "auth flow"

# Sync to git
obsidian-agent git-sync
```

## Structure

```
KnowledgeBase/
├── README.md          # This file
├── Projects/          # Per-project documentation
├── Runbooks/          # Operational procedures
├── Architecture/      # System design and patterns
├── Decisions/         # Architecture Decision Records (ADRs)
├── Playbooks/         # Standard operating procedures
└── Templates/         # Note templates
```

## Templates Available

- **ADR** - Architecture Decision Record
- **Runbook** - Operational procedures
- **Project-Setup** - Project documentation
- **Daily-Standup** - Daily standup notes
- **Postmortem** - Incident postmortems

## Creating Notes

### From Obsidian GUI
1. Cmd+N (New Note)
2. Cmd+P → "Templater: Open Insert Template Modal"
3. Select template

### From Terminal (Agents)
```bash
obsidian-agent create-note "My Note" ADR
```

## Git Workflow

This knowledge base is version controlled. Changes are automatically committed:

```bash
# Manual sync
obsidian-agent git-sync

# Check status
obsidian-agent git-status

# Or use git directly
cd ~/KnowledgeBase
git add .
git commit -m "docs: add new decision"
git push
```

## Search

### In Obsidian
- Cmd+O - Quick open
- Cmd+Shift+F - Global search
- `[[` - Link to existing notes

### From Terminal
```bash
obsidian-agent search "query"
```

## Best Practices

1. **Link everything** - Use `[[Note Name]]` to connect ideas
2. **Tag consistently** - Use #adr, #runbook, #project tags
3. **Daily standups** - Create daily notes for standups
4. **ADRs for decisions** - Document architectural decisions
5. **Git commit often** - Sync regularly
6. **Templates** - Use templates for consistency

## Graph View

In Obsidian: 
- Cmd+G - Open graph view to see connections
- Shows visual relationships between notes

## Links

- [Obsidian Help](https://help.obsidian.md/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Agent Documentation](~/.config/opencode/Harness.md)

---

*This knowledge base is maintained as part of the agentic development workflow.*
*Last updated: $(date +%Y-%m-%d)*
