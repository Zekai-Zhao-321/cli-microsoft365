# AI-Native CLI for Microsoft 365 - Implementation Plan

## Research Summary

### The "MCP is Dead, Long Live CLI" Trend (2026)
The AI agent ecosystem has shifted decisively toward CLI-first tooling:
- **Token cost**: CLI tools are **10-32x cheaper** than MCP servers (MCP consumes 70K-90K tokens per task, ~72% of context window)
- **Reliability**: CLI achieves **100% success** vs MCP's **72%** in benchmarks
- **Training alignment**: LLMs deeply understand CLI patterns from billions of training examples (man pages, Stack Overflow, GitHub)
- **Composability**: LLMs can improvise novel Unix pipe chains because they've learned the composability grammar
- **Consensus**: Smart architectures use CLI for developer workflows (token-efficient) and MCP only for enterprise systems without CLIs

Sources: [MCP is Dead; Long Live MCP!](https://chrlschn.dev/blog/2026/03/mcp-is-dead-long-live-mcp/), [Why CLI Tools Are Beating MCP](https://jannikreinhard.com/2026/02/22/why-cli-tools-are-beating-mcp-for-ai-agents/), [MCP vs CLI Benchmark](https://www.scalekit.com/blog/mcp-vs-cli-use)

### How People Actually Use M365 (Daily Pain Points)

#### Outlook (Email) — 2.5-4 hours/day, 120-150 emails/day
| Daily Task | Pain Level | What Copilot Does | What Copilot Misses |
|---|---|---|---|
| **Inbox triage** (scan, flag, archive) | Very High | Prioritization, thread summaries | Bulk operations ("archive all newsletters >7 days"), smart rules |
| **Reading long threads** (15-30+ messages) | Very High | Thread summarization (best feature) | Cross-thread correlation, decision tracking |
| **Composing replies** (20-50/day) | High | Draft generation, tone coaching | Template library with smart matching |
| **Searching for old emails** | High | Natural language Q&A over mailbox | Reliable search, attachment finding |
| **Follow-up tracking** ("awaiting reply") | High | Action item extraction (one-shot) | Persistent tracking, auto-reminders, accountability dashboard |
| **Cross-app workflows** (email→SharePoint→Teams) | Medium | None | "Save attachment to project SharePoint and notify team in Teams" |
| **Bulk operations** | Medium | None | "Categorize all emails from this project", batch move/archive |

#### Teams — 50-200+ unread messages/day
| Daily Task | Pain Level | What Copilot Does | What Copilot Misses |
|---|---|---|---|
| **Catching up on chat/channels** | Very High | Chat/channel summaries, catch-up | Cross-team daily digest, proactive "you missed something important" |
| **Finding old messages/files** | Very High | Natural language search | Reliable search within date ranges, across chats |
| **Post-meeting action items** | High | Extract action items from transcript | Auto-create Planner/To-Do tasks from action items |
| **Team/channel sprawl** | High | None | Identify stale teams, suggest archiving, governance |
| **Cross-app context switching** | High | Some cross-Graph queries | Unified project view across Teams+SharePoint+Planner |
| **Scheduling meetings** | Medium | "Find a time" | Optimal scheduling, "this could be async" suggestions |

#### SharePoint — Document management backbone
| Daily Task | Pain Level | What Copilot Does | What Copilot Misses |
|---|---|---|---|
| **Finding documents** | Very High | Doc Q&A, natural language search | Reliable search, cross-library discovery |
| **Permissions management** | Very High | None | "Who has access to X?", audit reports, fix broken inheritance |
| **Content sprawl/governance** | Very High | None | Identify orphaned sites, enforce naming, lifecycle management |
| **Bulk operations** (move, rename, tag) | High | None | Bulk metadata update, bulk move between libraries |
| **Workflows/approvals** | High | None | Natural language workflow creation (Power Automate gap) |
| **Version management** | Medium | None | Version comparison, cleanup old versions |
| **Admin reporting** (storage, sharing, compliance) | Medium | None | Tenant-wide reports, external sharing audit |

### Microsoft Copilot Architecture (Reverse-Engineered)

Copilot internally is: **Graph API tool wrappers + Semantic Index (RAG) + LLM orchestrator**

Its "tools" map to Graph API endpoints. Key architecture insights:
- **`/search/query`** is the single most important endpoint (unified search across mail, files, chats, people, events)
- **80% reads, 20% writes** — most interactions are "find/list/summarize", not "create/update/delete"
- **Cross-app scenarios** are highest value: meeting prep (calendar→attendees→files→emails), meeting follow-up (transcript→tasks→email)
- **Copilot Studio pre-built actions** reveal what Microsoft considers most important: get email summary, draft reply, find meeting times, get meeting recap, search files, get file summary, create task, get user profile

**Where CLI agents beat Copilot:**
| CLI Advantage | Why It Matters |
|---|---|
| Bulk/batch operations | Copilot handles one item at a time; CLI can script thousands |
| Admin operations | Copilot is end-user only; CLI has SPO admin, Entra admin, Teams admin |
| Automation/scheduling | Copilot is interactive only; CLI can be cron/CI/CD |
| Transparency | Copilot is black-box; CLI shows every command |
| Composability | Copilot outputs text; CLI outputs JSON, pipes, composes |
| Cross-tenant | Copilot is single-tenant; CLI switches connections |
| Developer workflows | SPFx, app registrations, Power Platform admin |

### Anthropic's Tool Design Principles
From [Writing Tools for Agents](https://www.anthropic.com/engineering/writing-tools-for-agents):
1. **Agent ergonomics** - tools intuitive for both agents and humans
2. **Iterate with evaluations** - test, measure, improve
3. **Optimize response format** - match LLM training data patterns (no one-size-fits-all)
4. **Manage context quantity** - pagination, filtering, truncation (Claude Code caps at 25K tokens)
5. **Minimal viable tool sets** - avoid bloated toolsets with ambiguous tool selection
6. **Rich tool definitions** - include examples, edge cases, input format requirements
7. **Invest in ACI** (Agent-Computer Interface) as much as HCI

### Anthropic's Skills Guide
From [Complete Guide to Building Skills](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf):
- **Progressive disclosure**: Level 1 (YAML frontmatter ~50-100 tokens) → Level 2 (SKILL.md body) → Level 3 (reference files)
- **Structure**: Folder with SKILL.md + optional `scripts/`, `references/`, `assets/`
- **Description must include** WHAT it does AND WHEN to trigger (with specific trigger phrases)
- **Keep SKILL.md under 5,000 words** - offload to `references/` for detailed docs
- **Five design patterns**: Sequential Workflow, Multi-MCP Coordination, Iterative Refinement, Context-Aware Tool Selection, Domain-Specific Intelligence
- **KPIs**: 90%+ trigger accuracy, 0 failed API calls, token efficiency vs mega-prompts
- **Testing**: Iterate on single hard task until success, then generalize

### cli-microsoft365 Codebase Analysis
- **Package**: `@pnp/cli-microsoft365` v11.7.0, MIT license
- **30+ M365 modules**: entra, teams, spo, outlook, onedrive, planner, todo, flow, pa, viva, etc.
- **Programmatic API** already exists at `src/api.ts`:
  ```typescript
  export async function executeCommand(commandName: string, options: any, listener?): Promise<CommandOutput>
  ```
- **Output formats**: json, csv, text, md, none + JMESPath query filtering (`--query`)
- **Auth**: MSAL-based (device code, cert, client credentials, username/password)
- **Existing AI**: "Chili" (`src/chili/`) - basic Mendable.ai doc Q&A (keeping as-is)
- **Architecture**: Abstract `Command` → `GraphCommand`/`SpoCommand` → individual commands with Zod schemas
- **Config**: Configstore + `.m365rc.json` project context

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Packaging | Inside existing repo at `src/agent/` | Direct access to `executeCommand`, auth, internals. Exported via `package.json` secondary entry point so consumers can `import from '@pnp/cli-microsoft365/agent'` |
| Skill scope (v1) | Outlook + Teams + SharePoint (priority) | Most common M365 agent workflows. Skill pack with sub-skills per domain |
| Chili | Keep as-is | Different purpose (human doc Q&A). Agent layer is additive |
| Skill architecture | Skill pack with sub-skills | One parent m365-agent skill pack containing domain sub-skills |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  AI Agent (Claude Code / Agent SDK / Any LLM)            │
├──────────────────────────────────────────────────────────┤
│  Claude Skills Pack (skills/m365-agent/)                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐    │
│  │ m365-mail  │ │ m365-teams │ │ m365-sharepoint    │    │
│  │ (sub-skill)│ │ (sub-skill)│ │ (sub-skill)        │    │
│  └─────┬──────┘ └─────┬──────┘ └────────┬───────────┘    │
│        └───────────────┴────────────────┘                │
│                        │                                  │
│  m365-navigator (router SKILL.md)                        │
├──────────────────────────────────────────────────────────┤
│  Agent Adapter Layer (src/agent/)                        │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐          │
│  │ executor │  │ discovery │  │  formatter   │          │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘          │
├───────┴───────────────┴──────────────┴───────────────────┤
│  Existing cli-microsoft365 (@pnp/cli-microsoft365)       │
│  executeCommand() → Command → Microsoft Graph API / SPO  │
│  Auth (MSAL)  │  Request  │  Output Formatting           │
└──────────────────────────────────────────────────────────┘
```

---

## Tool Design Philosophy

Based on user research + Copilot reverse-engineering + Anthropic's principles:

### Principle 1: Intent-Based Tools, Not Command Wrappers
Don't expose 600+ CLI commands as 600 tools. Group by **user intent**:

| User Intent | Tool Name | Maps to CLI Commands |
|---|---|---|
| "Check my email" | `m365-mail-read` | `outlook mail list`, `outlook mail get` |
| "Send an email" | `m365-mail-send` | `outlook mail send` |
| "Find a file" | `m365-file-find` | `spo file list`, `onedrive ...`, `search` |
| "What happened in Teams?" | `m365-teams-catchup` | `teams message list`, `teams channel list` |
| "Send a Teams message" | `m365-teams-send` | `teams message send` |
| "Manage tasks" | `m365-task-manage` | `planner task *`, `todo task *` |
| "SharePoint operations" | `m365-spo-manage` | `spo site/file/list/listitem *` |
| "Find anything across M365" | `m365-search` | `search` (unified) |
| "Who is...?" | `m365-people` | `entra user get`, `entra group *` |
| "Admin operations" | `m365-admin` | `spo site *`, `entra *`, `teams team *` |

**~10 intent-based tools cover 90%+ of scenarios** (vs 600+ raw commands).

### Principle 2: Read-Heavy, Write-Cautious
- Read tools (list, get, search) → execute immediately, return JSON
- Write tools (send, create, delete) → include `confirm: true` option, surface what will happen before doing it
- This matches the 80/20 read/write split observed in Copilot usage

### Principle 3: Pain-Point-First Feature Priority
Based on user research, these are the **highest-value features** an AI agent should enable:

**P0 — Solves daily pain (every knowledge worker):**
1. **Email triage assistant**: List inbox → summarize → bulk archive/categorize (pain: 30-60 min/day wasted)
2. **Teams catch-up**: Summarize unread across all chats/channels (pain: 30-60 min/day wasted)
3. **Cross-M365 search**: "Find the document Sarah mentioned" (pain: 15-30 min/day wasted)
4. **Meeting follow-up**: Extract action items → create tasks → draft follow-up email (pain: meetings have no accountability)

**P1 — Solves weekly pain (power users):**
5. **SharePoint permissions audit**: "Who has access to this site?" (pain: admin nightmare)
6. **Bulk email operations**: Archive, categorize, move by criteria (pain: Copilot can't do this)
7. **Team governance**: Find stale teams/channels, suggest cleanup (pain: team sprawl)

**P2 — Admin/developer advantage (CLI's moat):**
8. **Tenant-wide reporting**: Storage, sharing, compliance reports
9. **Bulk SharePoint operations**: Metadata updates, file moves, site provisioning
10. **Power Platform management**: Flow management, app management

### Principle 4: Token Budget by Tool
| Tool | Default Max Tokens | Rationale |
|---|---|---|
| `m365-search` | 2,000 | Return titles/snippets, not full content |
| `m365-mail-read` (list) | 3,000 | Subject, from, date, preview — not full body |
| `m365-mail-read` (get single) | 6,000 | Full email body, but truncate if huge |
| `m365-teams-catchup` | 4,000 | Summaries across channels |
| `m365-file-find` | 2,000 | File names, paths, modified dates |
| `m365-spo-manage` | 4,000 | Varies by operation |
| `m365-admin` | 4,000 | Structured reports |

### Principle 5: Error Messages Are Tools
Every error should be an actionable instruction the agent can follow:
```json
{
  "error": "Access denied: insufficient permissions",
  "suggestion": "Run 'm365 login' to authenticate, or request the 'Mail.Read' permission scope from your admin",
  "helpCommand": "m365 status --output json"
}
```

---

## Part 1: Agent Adapter Layer (`src/agent/`)

### 1.1 Agent Executor (`src/agent/executor.ts`)

Thin wrapper around `executeCommand` with agent-optimized defaults:

```typescript
export interface AgentExecuteOptions {
  command: string;              // e.g. "outlook mail list"
  options?: Record<string, any>;
  maxTokens?: number;           // default 4000, max 25000
  page?: number;                // pagination (default 1)
  pageSize?: number;            // items per page (default 10)
  fields?: string[];            // select specific fields for token savings
}

export interface AgentResult {
  success: boolean;
  data: any;                    // parsed JSON
  totalCount?: number;          // for paginated results
  page?: number;
  hasMore?: boolean;
  error?: {
    message: string;            // agent-readable error
    code?: string;              // OData/Graph error code
    suggestion?: string;        // actionable fix
  };
  tokenEstimate: number;
}

export async function agentExecute(opts: AgentExecuteOptions): Promise<AgentResult>
```

**Key behaviors:**
- Always forces `output: 'json'` (structured data for agents)
- Applies field selection before returning (massive token savings)
- Truncates responses exceeding `maxTokens` with `hasMore: true`
- Translates OData/Graph errors into actionable messages:
  - `"Access denied"` → `{ message: "...", suggestion: "Run 'm365 login' or check permissions for Mail.Read scope" }`
  - `"Resource not found"` → `{ message: "...", suggestion: "Verify the ID/URL. Use 'outlook mail list' to find valid IDs" }`
- Pagination wrapper for list commands

**Files to reuse:**
- `src/api.ts` → `executeCommand()` (the foundation)
- `src/utils/odata.ts` → `GraphResponseError` (error translation patterns)
- `src/Command.ts:29-36` → `CommandError`, `CommandErrorWithOutput`

### 1.2 Command Discovery (`src/agent/discovery.ts`)

Agents need to find the right command without browsing 600+ options:

```typescript
export interface CommandCatalogEntry {
  name: string;               // "outlook mail list"
  description: string;        // "Lists emails from a mailbox"
  domain: string;             // "outlook"
  requiredOptions: string[];  // ["--folder"]
  optionalOptions: string[];  // ["--top", "--filter"]
  examples: string[];         // 1-2 usage examples
}

export function getCommandCatalog(domain?: string): CommandCatalogEntry[]
export function searchCommands(query: string): CommandCatalogEntry[]
export function getCommandHelp(commandName: string): string
```

**Key behaviors:**
- Builds catalog from `CommandInfo` metadata + Zod schemas (existing data)
- `searchCommands` does fuzzy match on name + description keywords
- Domain filter returns only relevant commands (e.g., `domain: "teams"`)
- Cached after first build (lazy initialization)
- Output is minimal — just enough for the agent to pick the right tool

**Files to reuse:**
- `src/cli/CommandInfo.ts` → command metadata structure
- `allCommands.json` / `allCommandsFull.json` → pre-built command index (from build step)
- Command `.schema` (Zod) → option details

### 1.3 Token-Aware Formatter (`src/agent/formatter.ts`)

```typescript
export function formatForAgent(data: any, opts: {
  maxTokens?: number;       // default 4000
  fields?: string[];        // field whitelist
  page?: number;
  pageSize?: number;
}): {
  formatted: any;
  tokenEstimate: number;
  truncated: boolean;
  totalCount?: number;
}
```

**Key behaviors:**
- Token estimation: `~4 chars per token` heuristic
- Field selection: only return requested properties from objects/arrays
- Array pagination: slice by `page`/`pageSize`, return `totalCount`
- Large string truncation: email bodies, HTML content → `"[truncated - 12,400 chars. Use 'outlook mail get --id <id>' for full content]"`
- Strip internal metadata fields (`@odata.context`, `@odata.type`, etc.)

### 1.4 Public API (`src/agent/index.ts`)

```typescript
// Programmatic imports
export { agentExecute, AgentExecuteOptions, AgentResult } from './executor.js';
export { getCommandCatalog, searchCommands, getCommandHelp, CommandCatalogEntry } from './discovery.js';
export { formatForAgent } from './formatter.js';
```

**Package.json addition:**
```json
{
  "exports": {
    ".": "./dist/api.js",
    "./agent": "./dist/agent/index.js"
  }
}
```

### 1.5 Agent CLI Commands (`src/m365/agent/`)

Register as first-class m365 commands so agents can use them via bash:

```bash
# Discover available commands
m365 agent catalog --domain outlook --output json

# Search for a command by intent
m365 agent search --query "send email with attachment" --output json

# Execute with agent-optimized output
m365 agent execute --command "outlook mail list" --options '{"top":5}' --fields "subject,from,receivedDateTime" --maxTokens 4000
```

---

## Part 2: Claude Skills Pack (`skills/`)

### 2.1 Skill Pack Structure

```
skills/
├── m365-agent/                              # Parent skill pack
│   ├── SKILL.md                             # Navigator/router skill
│   ├── references/
│   │   ├── command-cheatsheet.md            # Quick reference for all domains
│   │   ├── auth-troubleshooting.md          # Common auth issues & fixes
│   │   └── cross-app-workflows.md           # Multi-service workflow recipes
│   └── sub-skills/
│       ├── m365-mail/
│       │   ├── SKILL.md                     # Mail workflows (pain-point driven)
│       │   └── references/
│       │       └── outlook-commands.md      # Full command reference
│       ├── m365-teams/
│       │   ├── SKILL.md                     # Teams workflows
│       │   └── references/
│       │       └── teams-commands.md
│       └── m365-sharepoint/
│           ├── SKILL.md                     # SharePoint workflows
│           └── references/
│               └── sharepoint-commands.md
```

### 2.2 Prerequisites Section (in every SKILL.md)

```markdown
## Prerequisites

1. Install the AI-native M365 CLI:
   ```bash
   npm install -g github:Zekai-Zhao-321/cli-microsoft365
   ```
   Or via npm (when published): `npm install -g @zekai/m365-agent`

2. Authenticate:
   ```bash
   m365 login
   ```

3. Verify connection:
   ```bash
   m365 status --output json
   ```
```

### 2.3 Navigator Skill (`skills/m365-agent/SKILL.md`)

```yaml
---
name: m365-agent
description: >
  Navigates and operates Microsoft 365 services (Outlook mail, Teams, SharePoint)
  using cli-microsoft365. Use when user mentions 'microsoft 365', 'm365', 'office 365',
  'outlook', 'email', 'teams', 'sharepoint', 'onedrive', or asks to interact with any
  Microsoft cloud service. Routes to domain-specific sub-skills for detailed workflows.
  NOT for Azure DevOps, Azure cloud infrastructure, or Windows administration.
metadata:
  author: cli-microsoft365
  version: 1.0.0
  category: productivity
---
```

**Navigator instructions (progressive disclosure pattern):**
1. **Always start**: Check auth status with `m365 status --output json`
2. **Route by intent**:
   - Email/mail/inbox/outlook → load m365-mail sub-skill
   - Teams/channels/chat/meetings → load m365-teams sub-skill
   - SharePoint/files/documents/sites/lists → load m365-sharepoint sub-skill
   - Cross-domain ("find file mentioned in email") → orchestrate between sub-skills
3. **Discovery fallback**: `m365 agent search --query "<user intent>" --output json`
4. **Error recovery**: See `references/auth-troubleshooting.md`

### 2.4 Mail Sub-Skill — Pain-Point Driven (`skills/m365-agent/sub-skills/m365-mail/SKILL.md`)

```yaml
---
name: m365-mail
description: >
  Manages Outlook email in Microsoft 365. Read inbox, send emails, search messages,
  manage folders, handle attachments. Use when user mentions 'email', 'mail', 'inbox',
  'send message', 'outlook', 'unread', or asks to check/manage/compose messages.
  NOT for calendar, contacts, or Teams messages.
metadata:
  version: 1.0.0
  category: productivity
---
```

**Workflow 1: Inbox Triage** (addresses #1 daily pain: 30-60 min/day wasted)
```bash
# List recent emails (token-efficient: only key fields)
m365 outlook mail list --top 20 --output json --query "[].{subject:subject,from:from.emailAddress.name,received:receivedDateTime,isRead:isRead,importance:importance}"

# Get full email when needed
m365 outlook mail get --id <messageId> --output json

# Move processed emails
m365 outlook mail move --id <messageId> --targetFolder "Archive"
```

**Workflow 2: Send Email** (addresses composing pain)
```bash
# Simple text email
m365 outlook mail send --to "user@company.com" --subject "Subject" --bodyContents "Body text" --bodyContentType Text

# HTML email with CC
m365 outlook mail send --to "user@company.com" --cc "other@company.com" --subject "Subject" --bodyContents "<p>HTML body</p>" --bodyContentType HTML

# With attachment
m365 outlook mail send --to "user@company.com" --subject "Subject" --bodyContents "See attached" --attachment "/path/to/file.pdf"
```

**Workflow 3: Email Search** (addresses search pain: 15-30 min/day wasted)
```bash
# Search by subject keyword
m365 outlook mail list --filter "contains(subject,'budget')" --output json

# Search by sender
m365 outlook mail list --filter "from/emailAddress/address eq 'boss@company.com'" --output json

# Cross-M365 search (finds emails, files, Teams messages)
m365 search --scopes "message" --queryText "quarterly review" --output json
```

**Workflow 4: Bulk Operations** (Copilot CAN'T do this — our differentiator)
```bash
# List all unread from a sender (agent pipes output to next command)
m365 outlook mail list --filter "isRead eq false and from/emailAddress/address eq 'newsletters@company.com'" --output json

# Agent can then loop through results to archive/move/categorize
```

**Error handling:**
| Error | Cause | Fix |
|---|---|---|
| "Access denied" | Not logged in or missing permissions | `m365 login` then ensure Mail.Read / Mail.Send scope |
| "Resource not found" | Invalid message ID | Re-list with `outlook mail list` to get valid IDs |
| "Throttled" | Too many API calls | Wait 30 seconds, retry with `--top` to reduce batch size |

### 2.5 Teams Sub-Skill — Pain-Point Driven (`skills/m365-agent/sub-skills/m365-teams/SKILL.md`)

```yaml
---
name: m365-teams
description: >
  Manages Microsoft Teams conversations, channels, and team membership.
  Use when user mentions 'teams', 'channel', 'chat', 'team message',
  'meeting', or asks about Teams conversations. NOT for email or SharePoint files.
metadata:
  version: 1.0.0
  category: productivity
---
```

**Workflow 1: Teams Catch-Up** (addresses #1 pain: notification overload)
```bash
# List all teams the user belongs to
m365 teams team list --joined --output json --query "[].{name:displayName,id:id}"

# List channels in a team
m365 teams channel list --teamId <teamId> --output json --query "[].{name:displayName,id:id}"

# Get recent messages from a channel
m365 teams message list --teamId <teamId> --channelId <channelId> --output json
```

**Workflow 2: Send Channel Message**
```bash
m365 teams message send --teamId <teamId> --channelId <channelId> --message "Your message here"
```

**Workflow 3: Team Membership Management**
```bash
# List members
m365 teams member list --teamId <teamId> --output json

# Add member
m365 teams member add --teamId <teamId> --userId <userId> --role member

# Remove member
m365 teams member remove --teamId <teamId> --userId <userId>
```

**Workflow 4: Team Governance** (Copilot CAN'T do this — our differentiator)
```bash
# List all teams (admin can find stale ones)
m365 teams team list --output json --query "[].{name:displayName,id:id,createdDateTime:createdDateTime}"

# Archive inactive teams
m365 teams team archive --id <teamId>
```

### 2.6 SharePoint Sub-Skill — Pain-Point Driven (`skills/m365-agent/sub-skills/m365-sharepoint/SKILL.md`)

```yaml
---
name: m365-sharepoint
description: >
  Manages SharePoint Online sites, document libraries, files, lists, and permissions.
  Use when user mentions 'sharepoint', 'document library', 'site', 'file upload',
  'download file', 'list items', 'permissions', or asks about documents/files in M365.
  NOT for OneDrive personal files or Teams messages.
metadata:
  version: 1.0.0
  category: productivity
---
```

**Workflow 1: Find & Access Documents** (addresses #1 pain: unreliable search)
```bash
# Search across all SharePoint
m365 search --scopes "driveItem" --queryText "quarterly report" --output json

# Browse a specific site's files
m365 spo file list --webUrl "https://contoso.sharepoint.com/sites/project" --folderUrl "/Shared Documents" --output json

# Download a file
m365 spo file get --webUrl "https://contoso.sharepoint.com/sites/project" --url "/Shared Documents/report.docx" --asFile --path "./report.docx"
```

**Workflow 2: Upload & Share Files**
```bash
# Upload file
m365 spo file add --webUrl "https://contoso.sharepoint.com/sites/project" --folder "/Shared Documents" --path "./report.pdf"

# Share with specific user
m365 spo file sharinglink add --webUrl "https://contoso.sharepoint.com/sites/project" --fileUrl "/Shared Documents/report.pdf" --type view --scope users
```

**Workflow 3: Permissions Audit** (Copilot CAN'T do this — #1 admin pain point)
```bash
# Check site permissions
m365 spo site get --url "https://contoso.sharepoint.com/sites/project" --output json

# List site users/groups
m365 spo user list --webUrl "https://contoso.sharepoint.com/sites/project" --output json

# Check specific group permissions
m365 spo group list --webUrl "https://contoso.sharepoint.com/sites/project" --output json
```

**Workflow 4: List/Item Management**
```bash
# List SharePoint lists
m365 spo list list --webUrl "https://contoso.sharepoint.com/sites/project" --output json

# Get list items
m365 spo listitem list --webUrl "https://contoso.sharepoint.com/sites/project" --listTitle "Tasks" --output json

# Add list item
m365 spo listitem add --webUrl "https://contoso.sharepoint.com/sites/project" --listTitle "Tasks" --Title "New task" --Status "Not Started"
```

**Workflow 5: Bulk Operations** (Copilot CAN'T do this — our differentiator)
```bash
# List all sites (find sprawl)
m365 spo site list --output json --query "[].{title:Title,url:Url,lastModified:LastContentModifiedDate,storageUsed:StorageUsageCurrent}"

# Site lifecycle: identify stale sites (agent processes dates)
# Bulk metadata updates (agent loops through listitem set commands)
```

### 2.7 Cross-App Workflow Recipes (`references/cross-app-workflows.md`)

**Recipe: Meeting Follow-Up Pipeline**
```
1. Get meeting details from calendar
2. Find related Teams channel messages
3. Extract action items (agent summarizes)
4. Create Planner tasks for each action item
5. Draft follow-up email with task assignments
6. Send to attendees
```

**Recipe: "Find the file Sarah mentioned"**
```
1. Search Teams messages for files shared by Sarah
2. Resolve file reference to SharePoint/OneDrive
3. Get file metadata and sharing info
4. Download or return file link
```

**Recipe: New Project Setup**
```
1. Create Teams team
2. Create channels for workstreams
3. SharePoint site is auto-created with team
4. Create Planner plan with standard buckets
5. Upload template documents to SharePoint
6. Add team members
```

---

## Current CLI Coverage vs Agent Needs

| Domain | Existing Commands | Coverage for Agent | Key Gaps |
|---|---|---|---|
| **Outlook (mail)** | 22 | Moderate | Missing: calendar CRUD, contacts, categories, focused inbox settings |
| **Teams** | 73 | Good | Missing: transcript search, presence, meeting management |
| **SharePoint** | 459 | Excellent | CLI's strongest area — perfect for admin/governance skills |
| **OneDrive** | 8 (mostly reports) | Weak | Missing: file search, sharing, version management, folder CRUD |
| **Planner** | ~15 | Good | Plan/bucket/task CRUD covered |
| **To Do** | ~10 | Good | List/task CRUD covered |
| **Entra ID** | 119 | Good | User/group/app management covered |
| **Search** | 1 (unified) | Critical | Already supports exact same search surface as Copilot — **this is our #1 tool** |
| **Insights** | 0 | Missing | No trending/used/shared files endpoints |
| **People** | 0 | Missing | No people graph, org chart, relationship queries |
| **Presence** | 0 | Missing | No user availability status |

**Strategy**: v1 works with what exists (plenty for mail, teams, sharepoint skills). v2 adds missing Graph endpoints for insights/people/presence.

---

## Part 3: Implementation Steps (Ordered)

### Step 1: Agent Adapter Core (src/agent/)
| File | Purpose |
|---|---|
| `src/agent/formatter.ts` | Token-aware formatting (no deps on other new files) |
| `src/agent/discovery.ts` | Command catalog and search |
| `src/agent/executor.ts` | Main agent execution wrapper |
| `src/agent/index.ts` | Public API exports |
| `src/agent/formatter.spec.ts` | Formatter tests |
| `src/agent/discovery.spec.ts` | Discovery tests |
| `src/agent/executor.spec.ts` | Executor tests |

### Step 2: Agent CLI Commands (src/m365/agent/)
| File | Purpose |
|---|---|
| `src/m365/agent/commands.ts` | Command name constants |
| `src/m365/agent/commands/agent-execute.ts` | `m365 agent execute` |
| `src/m365/agent/commands/agent-search.ts` | `m365 agent search` |
| `src/m365/agent/commands/agent-catalog.ts` | `m365 agent catalog` |
| + spec files for each | Tests |

### Step 3: Skills Pack (skills/)
| File | Purpose |
|---|---|
| `skills/m365-agent/SKILL.md` | Navigator/router |
| `skills/m365-agent/references/command-cheatsheet.md` | Quick reference |
| `skills/m365-agent/references/auth-troubleshooting.md` | Auth help |
| `skills/m365-agent/sub-skills/m365-mail/SKILL.md` | Mail workflows |
| `skills/m365-agent/sub-skills/m365-mail/references/outlook-commands.md` | Full reference |
| `skills/m365-agent/sub-skills/m365-teams/SKILL.md` | Teams workflows |
| `skills/m365-agent/sub-skills/m365-teams/references/teams-commands.md` | Full reference |
| `skills/m365-agent/sub-skills/m365-sharepoint/SKILL.md` | SharePoint workflows |
| `skills/m365-agent/sub-skills/m365-sharepoint/references/sharepoint-commands.md` | Full reference |

### Step 4: Integration
- Add `"./agent"` export to `package.json`
- Add agent type declarations to `src/api.d.ts`

---

## Design Principles Applied

| Anthropic Principle | Implementation |
|---|---|
| **Token efficiency** | Default 4K limit, field selection, pagination, OData metadata stripping |
| **Agent ergonomics** | Structured JSON always, actionable error suggestions, command discovery |
| **Minimal tool set** | 3 agent commands (execute, search, catalog) — not 600+ raw commands |
| **Progressive disclosure** | Skills: YAML frontmatter (~100 tokens) → SKILL.md body → references/ |
| **Composability** | Sub-skills work independently; agent commands pipe naturally via JSON |
| **Evaluation-driven** | Mocha/Sinon test suite following existing codebase patterns |
| **Context management** | Response truncation, field filtering, pagination with `hasMore` |
| **Rich tool definitions** | Skills include examples, error handling, edge cases per Anthropic guidance |

---

## Verification Plan

### Unit Tests
```bash
npm run test:test -- --grep "agent"
```
- Executor: mock `executeCommand`, verify JSON forcing, error translation, pagination
- Formatter: verify field selection, truncation, token estimation, pagination math
- Discovery: verify catalog building from CommandInfo, search fuzzy matching

### Integration Tests (requires `m365 login`)
```bash
m365 agent catalog --domain outlook --output json
m365 agent search --query "send email" --output json
m365 agent execute --command "outlook mail list" --options '{"top":3}' --fields "subject,from"
```

### Skill Testing Checklist
- [ ] "check my email" triggers m365-mail (positive)
- [ ] "write a Python email parser" does NOT trigger (negative)
- [ ] "send an email to john" completes full workflow
- [ ] "list my teams channels" routes through navigator → teams sub-skill
- [ ] "upload a file to sharepoint" completes with correct spo commands
- [ ] Token usage measured: target 5-10x reduction vs raw `m365 --help` in context

### KPI Targets
| Metric | Target |
|---|---|
| Skill trigger accuracy | 90%+ on relevant queries |
| API call success rate | 0 failures per workflow |
| Token efficiency | 5-10x cheaper than raw CLI help in context |
| Response size | < 4K tokens by default |

---

## Key Existing Files (Reference)

| File | What to reuse |
|---|---|
| `src/api.ts` | `executeCommand()` — the foundation |
| `src/Command.ts` | Base class, output formatting (lines 603-730), `CommandError` |
| `src/cli/cli.ts` | `loadAllCommandsInfo()`, `executeCommandWithOutput()` |
| `src/cli/CommandInfo.ts` | Command metadata structure |
| `src/utils/odata.ts` | `GraphResponseError` for error translation |
| `src/settingsNames.ts` | Configuration keys |
| `src/Auth.ts` | Authentication (reuse as-is, ~1100 lines) |
| `src/request.ts` | HTTP client (reuse as-is) |
| `src/chili/chili.ts` | Keeping as-is (different purpose) |
