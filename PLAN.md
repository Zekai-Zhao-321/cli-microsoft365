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

### Competitive Landscape: Softeria ms-365-mcp-server

The most popular community M365 MCP server ([GitHub](https://github.com/Softeria/ms-365-mcp-server)) — **584 stars**, 223 forks, 86+ tools. Key learnings:

**What they cover (86 tools):**
| Domain | Tools | Notes |
|---|---|---|
| Mail | 13 | List, send, draft, move, delete, folders |
| Calendar | 7 | CRUD events, calendar view |
| OneDrive | 6 | Browse, upload, download, delete |
| Excel | 5 | Worksheets, ranges, charts |
| OneNote | 5 | Notebooks, sections, pages |
| To Do | 6 | Full CRUD |
| Planner | 5 | Plans, tasks |
| Contacts | 5 | Full CRUD |
| Teams/Chats | 15 | Chats, channels, messages, members |
| SharePoint | 12 | Sites, drives, lists, items |
| Shared Mailbox | 4 | Read/send from shared mailboxes |
| Utility | 3 | Current user, search, list users |

**What they DON'T cover (our moat):**
- No Power Platform, Entra ID, Intune, Security & Compliance, Viva
- No SharePoint admin operations (cli-microsoft365 has 459!)
- No bulk operations, no scripting/chaining
- No offline/cached operations
- No enterprise deployment story (proxy, K8s, multi-tenant admin)

**Their top pain points (from GitHub issues):**
1. **Auth is #1 friction** — OAuth/PKCE bugs, token refresh issues, enterprise SSO problems
2. **Context window overload** — 86+ tools overwhelm LLM context (they added "presets" to mitigate)
3. **Large inbox performance** — doesn't handle large mailboxes well
4. **Enterprise deployment gaps** — proxy, HTTPS, K8s all unsolved

**Key insight — the PnP wrapper exists too:**
[pnp/cli-microsoft365-mcp-server](https://github.com/pnp/cli-microsoft365-mcp-server) (91 stars) wraps cli-microsoft365 with just 4 meta-tools (search commands, get docs, run command, get best practices). Only 91 stars vs Softeria's 584 — suggests the wrapper approach hasn't captured mindshare because it requires pre-installing the CLI. But the 4-meta-tool pattern is smart — avoids context bloat.

**Competitive positioning for our project:**
| Dimension | Softeria MCP | PnP MCP Wrapper | Our Agent CLI |
|---|---|---|---|
| Install friction | `npx` one-liner | Install CLI + MCP | Install CLI (npm -g) |
| Auth quality | Fragile (PKCE bugs) | Battle-tested (CLI) | Battle-tested (CLI) |
| Tool count | 86 (context bloat) | 4 meta-tools | ~10 intent-based |
| Coverage | End-user only | 600+ commands | 200 Graph endpoints + CLI fallback |
| Bulk operations | No | Yes (via CLI) | Yes (native) |
| Admin/governance | No | Yes (via CLI) | Yes (native) |
| Token efficiency | TOON format (30-60% savings) | Medium | Field selection + pagination |
| Skills/workflows | No | No | Claude Skills with progressive disclosure |
| Composability | MCP only | CLI pipes | CLI pipes + programmatic API |

**Must-match from Softeria:**
1. Zero-friction setup (npm one-liner)
2. Multi-account support
3. Selective tool loading (their "presets" → our Skills progressive disclosure)
4. Calendar, Contacts, OneDrive, Excel, OneNote coverage

### Request.ts Proxy Issue (Affects Our Architecture)

`src/request.ts:189-193` manually reads `HTTP_PROXY`/`HTTPS_PROXY` and sets `options.proxy` on every request. This bypasses Axios's native `proxy-from-env` which handles `NO_PROXY`. Active PR discussion with maintainer — the fix is to remove `createProxyConfigFromUrl` entirely and let Axios handle it natively.

**Impact on us**: We reuse `request.ts` directly. In our fork, we should apply the fix (remove lines 189-193 and `createProxyConfigFromUrl`). Corporate proxy users are a key audience for M365 tooling.

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

### Why Direct Graph API, Not CLI Wrapper

The original plan was to wrap cli-microsoft365's `executeCommand()`. But research revealed:
- **CLI has major gaps**: Only 22 Outlook commands (no calendar, contacts, presence). Only 8 OneDrive commands. No insights/people endpoints.
- **A human employee needs everything**: email, calendar, contacts, files, teams, tasks, people, presence — not just what the CLI supports
- **CLI's command framework adds overhead**: argument parsing, Zod validation, telemetry — unnecessary for programmatic agent calls
- **But CLI's auth is excellent**: MSAL integration, multi-cloud, token refresh, file persistence — all reusable

**New approach**: Build a thin **Graph API client** that reuses CLI's auth layer directly.

```
┌─────────────────────────────────────────────────────────────┐
│  AI Agent (Claude Code / Agent SDK / Any LLM)               │
├─────────────────────────────────────────────────────────────┤
│  Claude Skills Pack (skills/m365-agent/)                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐       │
│  │ m365-mail  │ │ m365-teams │ │ m365-sharepoint    │       │
│  │ (sub-skill)│ │ (sub-skill)│ │ (sub-skill)        │       │
│  └─────┬──────┘ └─────┬──────┘ └────────┬───────────┘       │
│        └───────────────┴────────────────┘                   │
│                        │                                     │
│  m365-navigator (router SKILL.md)                           │
├─────────────────────────────────────────────────────────────┤
│  Agent Graph Client (src/agent/)                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐              │
│  │  graph/   │  │ discovery │  │  formatter   │              │
│  │ mail.ts   │  │   .ts     │  │    .ts       │              │
│  │ calendar  │  └───────────┘  └──────────────┘              │
│  │ teams.ts  │                                               │
│  │ files.ts  │  Intent-based operations that call             │
│  │ tasks.ts  │  Graph API directly for FULL coverage          │
│  │ people.ts │                                               │
│  │ search.ts │                                               │
│  └─────┬─────┘                                               │
├────────┴────────────────────────────────────────────────────┤
│  Reused from cli-microsoft365 (minimal extraction)           │
│  ┌───────────┐  ┌────────────┐  ┌──────────────────┐        │
│  │  Auth.ts  │  │ request.ts │  │ FileTokenStorage  │        │
│  │  (1042 ln)│  │  (254 ln)  │  │  + msalCache      │        │
│  └───────────┘  └────────────┘  └──────────────────┘        │
│  Same login session — user runs `m365 login` once            │
│  Both CLI and agent tools share the same tokens              │
└─────────────────────────────────────────────────────────────┘
```

### What We Reuse from CLI (3 files, ~1,300 lines total)
| File | Lines | What It Does |
|---|---|---|
| `Auth.ts` | 1,042 | Token acquisition (8 auth flows), refresh, MSAL, multi-cloud, connection management |
| `request.ts` | 254 | HTTP client with auto-auth injection, 429/503 retry, cloud URL rewriting |
| `auth/FileTokenStorage.ts` | ~30 | Token persistence to disk (same files as CLI) |
| `auth/msalCachePlugin.ts` | ~20 | MSAL cache hooks |
| `utils/odata.ts` | ~50 | Automatic OData pagination (follows `@odata.nextLink`) |

### What We Build New
Intent-based Graph API operations covering the **full human employee experience** — everything a person does daily in M365, organized by domain.

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

## Part 1: Agent Graph Client (`src/agent/`)

### 1.1 Core: Graph Client (`src/agent/graph-client.ts`)

Thin wrapper over CLI's `request` module with agent-friendly defaults:

```typescript
import auth from '../Auth.js';
import request from '../request.js';

export interface GraphResponse<T> {
  success: boolean;
  data: T;
  totalCount?: number;
  page?: number;
  hasMore?: boolean;
  error?: {
    message: string;
    code?: string;
    suggestion?: string;
  };
  tokenEstimate: number;
}

export class GraphClient {
  private resource = 'https://graph.microsoft.com';

  // Ensure user is logged in (reuse CLI's auth)
  async ensureAuth(): Promise<boolean> {
    await auth.restoreAuth();
    return auth.connection.active;
  }

  // Generic GET with pagination, field selection, token limits
  async get<T>(endpoint: string, opts?: {
    select?: string[];       // $select fields (token savings)
    filter?: string;         // $filter OData expression
    top?: number;            // $top page size (default 10)
    skip?: number;           // $skip for pagination
    orderBy?: string;        // $orderby
    expand?: string;         // $expand for relationships
    maxTokens?: number;      // truncate response
  }): Promise<GraphResponse<T>>

  // POST, PATCH, DELETE with confirmation support
  async post<T>(endpoint: string, body: any): Promise<GraphResponse<T>>
  async patch<T>(endpoint: string, body: any): Promise<GraphResponse<T>>
  async delete(endpoint: string): Promise<GraphResponse<void>>

  // Batch requests (up to 20 per call, Graph API limit)
  async batch(requests: BatchRequest[]): Promise<BatchResponse[]>
}
```

**Key behaviors:**
- Reuses CLI's `auth.ensureAccessToken()` and `request` module directly
- Builds OData query params from structured options (`$select`, `$filter`, `$top`)
- Auto-strips `@odata.context`, `@odata.type`, `@odata.etag` metadata
- Token estimation on response, truncation with `hasMore` indicator
- Actionable error translation (same pattern as before)

### 1.2 Domain Modules — "The Human Employee's Toolkit"

Each module represents what a human employee does in that M365 app daily:

#### `src/agent/graph/mail.ts` — Full Outlook Email Experience

```typescript
export class MailOperations {
  // === INBOX (what every employee does first thing in the morning) ===
  async listInbox(opts?: { top?, filter?, select? }): Promise<GraphResponse<Message[]>>
  async getMessage(id: string): Promise<GraphResponse<Message>>
  async getUnreadCount(): Promise<GraphResponse<{ count: number }>>

  // === COMPOSE (20-50 times per day) ===
  async sendMail(to: string[], subject: string, body: string, opts?: {
    cc?: string[], bcc?: string[], bodyType?: 'Text'|'HTML',
    attachments?: { name: string, path: string }[],
    importance?: 'low'|'normal'|'high'
  }): Promise<GraphResponse<void>>
  async replyToMessage(id: string, body: string): Promise<GraphResponse<void>>
  async forwardMessage(id: string, to: string[], comment?: string): Promise<GraphResponse<void>>
  async createDraft(to: string[], subject: string, body: string): Promise<GraphResponse<Message>>

  // === ORGANIZE (triage workflow) ===
  async moveMessage(id: string, folder: string): Promise<GraphResponse<void>>
  async deleteMessage(id: string): Promise<GraphResponse<void>>
  async markAsRead(id: string): Promise<GraphResponse<void>>
  async flagMessage(id: string): Promise<GraphResponse<void>>
  async categorizeMessage(id: string, categories: string[]): Promise<GraphResponse<void>>

  // === SEARCH (15-30 min/day wasted finding emails) ===
  async searchMail(query: string, opts?: { top?, from?, after?, before? }): Promise<GraphResponse<Message[]>>

  // === FOLDERS ===
  async listFolders(): Promise<GraphResponse<MailFolder[]>>
  async createFolder(name: string, parentId?: string): Promise<GraphResponse<MailFolder>>

  // === ATTACHMENTS ===
  async listAttachments(messageId: string): Promise<GraphResponse<Attachment[]>>
  async downloadAttachment(messageId: string, attachmentId: string, savePath: string): Promise<void>

  // === BULK (Copilot CAN'T do this) ===
  async bulkMove(filter: string, targetFolder: string): Promise<GraphResponse<{ moved: number }>>
  async bulkMarkRead(filter: string): Promise<GraphResponse<{ updated: number }>>
  async bulkDelete(filter: string): Promise<GraphResponse<{ deleted: number }>>
}
// Maps to: GET/POST /me/messages, /me/mailFolders, /me/sendMail, etc.
```

#### `src/agent/graph/calendar.ts` — Full Calendar Experience (MISSING from CLI)

```typescript
export class CalendarOperations {
  // === VIEW (employees check calendar constantly) ===
  async listEvents(opts?: { startDate?, endDate?, top? }): Promise<GraphResponse<Event[]>>
  async getEvent(id: string): Promise<GraphResponse<Event>>
  async getToday(): Promise<GraphResponse<Event[]>>
  async getThisWeek(): Promise<GraphResponse<Event[]>>

  // === MANAGE (scheduling is daily) ===
  async createEvent(event: {
    subject: string, start: DateTime, end: DateTime,
    attendees?: string[], location?: string, body?: string,
    isOnlineMeeting?: boolean, recurrence?: Recurrence
  }): Promise<GraphResponse<Event>>
  async updateEvent(id: string, updates: Partial<Event>): Promise<GraphResponse<Event>>
  async deleteEvent(id: string): Promise<GraphResponse<void>>

  // === RESPOND (accept/decline is constant) ===
  async acceptEvent(id: string, comment?: string): Promise<GraphResponse<void>>
  async declineEvent(id: string, comment?: string): Promise<GraphResponse<void>>
  async tentativelyAccept(id: string, comment?: string): Promise<GraphResponse<void>>

  // === SCHEDULING (find free time) ===
  async findMeetingTimes(attendees: string[], duration: string, opts?: {
    startDate?, endDate?, isOrganizerOptional?
  }): Promise<GraphResponse<MeetingTimeSuggestion[]>>
  async getSchedule(users: string[], startDate: string, endDate: string): Promise<GraphResponse<Schedule[]>>
}
// Maps to: /me/events, /me/calendarView, /me/calendar/events, /me/findMeetingTimes, /me/calendar/getSchedule
```

#### `src/agent/graph/teams.ts` — Full Teams Experience

```typescript
export class TeamsOperations {
  // === TEAMS & CHANNELS ===
  async listMyTeams(): Promise<GraphResponse<Team[]>>
  async listChannels(teamId: string): Promise<GraphResponse<Channel[]>>
  async createTeam(name: string, opts?: { description?, template? }): Promise<GraphResponse<Team>>

  // === MESSAGES (the main thing people do in Teams) ===
  async listChannelMessages(teamId: string, channelId: string, opts?: { top? }): Promise<GraphResponse<ChatMessage[]>>
  async sendChannelMessage(teamId: string, channelId: string, content: string): Promise<GraphResponse<ChatMessage>>
  async replyToMessage(teamId: string, channelId: string, messageId: string, content: string): Promise<GraphResponse<ChatMessage>>

  // === CHAT (1:1 and group) ===
  async listChats(opts?: { top? }): Promise<GraphResponse<Chat[]>>
  async listChatMessages(chatId: string, opts?: { top? }): Promise<GraphResponse<ChatMessage[]>>
  async sendChatMessage(chatId: string, content: string): Promise<GraphResponse<ChatMessage>>

  // === MEMBERS ===
  async listMembers(teamId: string): Promise<GraphResponse<Member[]>>
  async addMember(teamId: string, userId: string, role?: string): Promise<GraphResponse<void>>
  async removeMember(teamId: string, membershipId: string): Promise<GraphResponse<void>>

  // === MEETINGS ===
  async listMeetings(): Promise<GraphResponse<OnlineMeeting[]>>
  async getMeetingTranscript(meetingId: string): Promise<GraphResponse<string>>

  // === GOVERNANCE (Copilot CAN'T do this) ===
  async archiveTeam(teamId: string): Promise<GraphResponse<void>>
  async listAllTeams(): Promise<GraphResponse<Team[]>>  // admin: find stale teams
}
// Maps to: /me/joinedTeams, /teams/{id}/channels, /teams/{id}/channels/{id}/messages,
//          /me/chats, /me/chats/{id}/messages, /me/onlineMeetings
```

#### `src/agent/graph/files.ts` — Full OneDrive + SharePoint Files Experience

```typescript
export class FileOperations {
  // === BROWSE (navigate file structure) ===
  async listMyFiles(folderPath?: string, opts?: { top? }): Promise<GraphResponse<DriveItem[]>>
  async listSiteFiles(siteUrl: string, folderPath?: string): Promise<GraphResponse<DriveItem[]>>
  async getFileMetadata(driveId: string, itemId: string): Promise<GraphResponse<DriveItem>>

  // === SEARCH (find files across M365) ===
  async searchFiles(query: string, opts?: { top? }): Promise<GraphResponse<DriveItem[]>>

  // === UPLOAD / DOWNLOAD ===
  async uploadFile(folderPath: string, localPath: string, opts?: { siteUrl? }): Promise<GraphResponse<DriveItem>>
  async downloadFile(driveId: string, itemId: string, savePath: string): Promise<void>

  // === SHARE ===
  async shareFile(driveId: string, itemId: string, opts: {
    recipients: string[], type: 'view'|'edit', message?: string
  }): Promise<GraphResponse<Permission>>
  async listPermissions(driveId: string, itemId: string): Promise<GraphResponse<Permission[]>>

  // === VERSIONS ===
  async listVersions(driveId: string, itemId: string): Promise<GraphResponse<DriveItemVersion[]>>

  // === INSIGHTS (trending/used/shared — MISSING from CLI entirely) ===
  async getTrendingFiles(): Promise<GraphResponse<DriveItem[]>>
  async getRecentFiles(): Promise<GraphResponse<DriveItem[]>>
  async getSharedWithMe(): Promise<GraphResponse<DriveItem[]>>
}
// Maps to: /me/drive/root/children, /sites/{id}/drive, /me/drive/items/{id},
//          /search/query, /me/insights/trending, /me/insights/used, /me/insights/shared
```

#### `src/agent/graph/tasks.ts` — Planner + To Do

```typescript
export class TaskOperations {
  // === PLANNER ===
  async listPlans(groupId: string): Promise<GraphResponse<Plan[]>>
  async listBuckets(planId: string): Promise<GraphResponse<Bucket[]>>
  async listTasks(planId: string, opts?: { bucketId? }): Promise<GraphResponse<PlannerTask[]>>
  async createTask(planId: string, task: {
    title: string, bucketId?: string, assignments?: string[],
    dueDate?: string, priority?: number
  }): Promise<GraphResponse<PlannerTask>>
  async updateTask(taskId: string, updates: Partial<PlannerTask>): Promise<GraphResponse<void>>
  async deleteTask(taskId: string): Promise<GraphResponse<void>>

  // === TO DO ===
  async listTodoLists(): Promise<GraphResponse<TodoList[]>>
  async listTodoTasks(listId: string): Promise<GraphResponse<TodoTask[]>>
  async createTodoTask(listId: string, title: string, opts?: {
    dueDate?, body?, importance?
  }): Promise<GraphResponse<TodoTask>>
  async completeTodoTask(listId: string, taskId: string): Promise<GraphResponse<void>>
}
// Maps to: /me/planner/plans, /planner/plans/{id}/tasks, /me/todo/lists, /me/todo/lists/{id}/tasks
```

#### `src/agent/graph/people.ts` — People & Presence (MISSING from CLI entirely)

```typescript
export class PeopleOperations {
  // === PEOPLE GRAPH (who do I work with?) ===
  async getMyPeople(opts?: { top? }): Promise<GraphResponse<Person[]>>
  async searchPeople(query: string): Promise<GraphResponse<Person[]>>
  async getUser(userId: string): Promise<GraphResponse<User>>
  async getManager(userId?: string): Promise<GraphResponse<User>>
  async getDirectReports(userId?: string): Promise<GraphResponse<User[]>>

  // === PRESENCE (is someone available?) ===
  async getMyPresence(): Promise<GraphResponse<Presence>>
  async getPresence(userId: string): Promise<GraphResponse<Presence>>
  async setMyPresence(availability: string, activity: string): Promise<GraphResponse<void>>

  // === PROFILE ===
  async getMyProfile(): Promise<GraphResponse<User>>
}
// Maps to: /me/people, /users/{id}, /me/manager, /me/directReports, /me/presence,
//          /users/{id}/presence, /communications/presences
```

#### `src/agent/graph/contacts.ts` — Full Contacts Experience (MISSING from CLI)

```typescript
export class ContactOperations {
  // === CONTACTS ===
  async listContacts(opts?: { top?, filter?, search? }): Promise<GraphResponse<Contact[]>>
  async getContact(id: string): Promise<GraphResponse<Contact>>
  async createContact(contact: {
    givenName: string, surname?: string, emailAddresses?: EmailAddress[],
    businessPhones?: string[], companyName?: string, jobTitle?: string
  }): Promise<GraphResponse<Contact>>
  async updateContact(id: string, updates: Partial<Contact>): Promise<GraphResponse<Contact>>
  async deleteContact(id: string): Promise<GraphResponse<void>>

  // === FOLDERS ===
  async listContactFolders(): Promise<GraphResponse<ContactFolder[]>>
  async createContactFolder(name: string): Promise<GraphResponse<ContactFolder>>
}
// Maps to: /me/contacts, /me/contactFolders
```

#### `src/agent/graph/search.ts` — Unified Search (most important tool)

```typescript
export class SearchOperations {
  // Unified search across ALL M365 content
  async search(query: string, opts?: {
    scopes?: ('message'|'event'|'driveItem'|'listItem'|'chatMessage'|'person'|'site')[],
    top?: number,
    from?: string,       // entity type filter
    after?: string,      // date filter
  }): Promise<GraphResponse<SearchResult[]>>
}
// Maps to: POST /search/query — the SAME endpoint Copilot uses internally
```

### 1.3 Token-Aware Formatter (`src/agent/formatter.ts`)

Same as before — handles field selection, pagination, truncation, token estimation.

### 1.4 Entry Point (`src/agent/index.ts`)

```typescript
export { GraphClient } from './graph-client.js';
export { MailOperations } from './graph/mail.js';
export { CalendarOperations } from './graph/calendar.js';
export { ContactOperations } from './graph/contacts.js';
export { TeamsOperations } from './graph/teams.js';
export { FileOperations } from './graph/files.js';
export { TaskOperations } from './graph/tasks.js';
export { PeopleOperations } from './graph/people.js';
export { SearchOperations } from './graph/search.js';
export { formatForAgent } from './formatter.js';
```

### 1.5 CLI Commands (optional convenience layer)

The agent tools are also exposed as CLI commands for bash-based agents:

```bash
# These call Graph API directly, not through the CLI command framework
m365 agent mail list --top 10 --select "subject,from,receivedDateTime"
m365 agent mail send --to "user@company.com" --subject "Hello" --body "Hi there"
m365 agent calendar today
m365 agent calendar create --subject "Standup" --start "2026-04-03T09:00" --end "2026-04-03T09:30" --attendees "team@company.com"
m365 agent teams messages --team "Engineering" --channel "General" --top 20
m365 agent files search --query "quarterly report"
m365 agent people search --query "Sarah"
m365 agent search --query "budget proposal" --scopes "message,driveItem"
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

| Domain | CLI Commands | Agent Needs (Graph Endpoints) | Coverage Gap |
|---|---|---|---|
| **Outlook (mail)** | 22 | ~35 (messages, folders, attachments, categories, rules) | 37% — missing folders, categories, rules, attachments |
| **Calendar** | 0 | ~28 (events, scheduling, rooms, reminders) | **100% gap** — entirely missing |
| **Contacts** | 0 | ~16 (contacts, folders, photos) | **100% gap** — entirely missing |
| **Teams** | 73 | ~40 (chats, channels, meetings, presence) | Good, but missing chats, presence, transcripts |
| **SharePoint** | 459 | ~15 (sites, lists, items via Graph) | CLI covers MORE than Graph for SPO admin |
| **OneDrive/Files** | 8 | ~35 (browse, upload, download, share, versions, insights) | 77% gap — mostly missing |
| **Planner** | ~15 | ~15 (plans, buckets, tasks, details) | Good coverage |
| **To Do** | ~10 | ~15 (lists, tasks, checklists, linked resources) | 67% coverage |
| **People/Insights** | 0 | ~12 (people graph, presence, trending, used, shared) | **100% gap** — entirely missing |
| **Search** | 1 | 1 (unified `/search/query`) | Covered — **same endpoint as Copilot** |
| **TOTAL** | ~600 (but narrow) | **~200** (but complete human experience) | CLI goes deep in SPO/Entra; agent goes wide across daily use |

### Permission Scopes Required

| Domain | Delegated Scopes |
|---|---|
| Email | `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `MailboxSettings.ReadWrite` |
| Calendar | `Calendars.Read`, `Calendars.ReadWrite`, `Calendars.Read.Shared` |
| Contacts | `Contacts.Read`, `Contacts.ReadWrite` |
| Teams | `Chat.Read`, `Chat.ReadWrite`, `ChatMessage.Send`, `ChannelMessage.Send`, `Team.ReadBasic.All`, `OnlineMeetings.ReadWrite`, `Presence.Read.All` |
| Files | `Files.Read`, `Files.ReadWrite`, `Files.ReadWrite.All`, `Sites.Read.All` |
| Tasks | `Tasks.Read`, `Tasks.ReadWrite`, `Group.Read.All` |
| People | `People.Read`, `User.Read`, `User.Read.All` |

**Strategy**: Build direct Graph API client covering all ~200 endpoints. Reuse CLI's auth (user runs `m365 login` once). CLI's 459 SharePoint admin commands remain available as fallback for deep SPO scenarios.

---

## Part 3: Implementation Steps (Ordered)

### Step 1: Graph Client Foundation
| File | Purpose |
|---|---|
| `src/agent/graph-client.ts` | Core Graph API client (reuses Auth.ts + request.ts) |
| `src/agent/formatter.ts` | Token-aware response formatting |
| `src/agent/graph-client.spec.ts` | Tests with mocked auth/request |
| `src/agent/formatter.spec.ts` | Formatter tests |

### Step 2: Domain Modules (P0 — daily employee operations)
| File | Purpose | Graph Endpoints |
|---|---|---|
| `src/agent/graph/mail.ts` | Full email (~35 endpoints) | `/me/messages`, `/me/sendMail`, `/me/mailFolders`, `/me/messages/*/attachments` |
| `src/agent/graph/calendar.ts` | Full calendar (~28 endpoints, **NEW**) | `/me/events`, `/me/calendarView`, `/me/findMeetingTimes`, `/me/calendar/getSchedule` |
| `src/agent/graph/contacts.ts` | Full contacts (~16 endpoints, **NEW**) | `/me/contacts`, `/me/contactFolders` |
| `src/agent/graph/teams.ts` | Full Teams (~40 endpoints) | `/me/joinedTeams`, `/teams/*/channels/*/messages`, `/me/chats`, `/me/onlineMeetings` |
| `src/agent/graph/files.ts` | OneDrive + SharePoint (~35 endpoints) | `/me/drive`, `/sites/*/drive`, `/me/insights/*`, permissions, versions |
| `src/agent/graph/tasks.ts` | Planner + To Do (~30 endpoints) | `/me/planner/plans`, `/me/todo/lists`, checklists, linked resources |
| `src/agent/graph/people.ts` | People + Presence (~12 endpoints, **NEW**) | `/me/people`, `/me/presence`, `/users/*`, `/me/manager`, `/me/directReports` |
| `src/agent/graph/search.ts` | Unified cross-M365 search | `POST /search/query` (same as Copilot's #1 tool) |
| + spec files for each | Tests | |

### Step 3: Agent CLI Commands
| File | Purpose |
|---|---|
| `src/m365/agent/commands.ts` | Command name constants |
| `src/m365/agent/commands/agent-mail.ts` | `m365 agent mail <action>` |
| `src/m365/agent/commands/agent-calendar.ts` | `m365 agent calendar <action>` |
| `src/m365/agent/commands/agent-teams.ts` | `m365 agent teams <action>` |
| `src/m365/agent/commands/agent-files.ts` | `m365 agent files <action>` |
| `src/m365/agent/commands/agent-search.ts` | `m365 agent search` |

### Step 4: Skills Pack
| File | Purpose |
|---|---|
| `skills/m365-agent/SKILL.md` | Navigator/router skill |
| `skills/m365-agent/references/command-cheatsheet.md` | Quick reference for all agent commands |
| `skills/m365-agent/references/auth-troubleshooting.md` | Auth issues & fixes |
| `skills/m365-agent/references/cross-app-workflows.md` | Multi-service recipes |
| `skills/m365-agent/sub-skills/m365-mail/SKILL.md` | Mail + Calendar workflows |
| `skills/m365-agent/sub-skills/m365-mail/references/outlook-commands.md` | Full mail/calendar reference |
| `skills/m365-agent/sub-skills/m365-teams/SKILL.md` | Teams workflows |
| `skills/m365-agent/sub-skills/m365-teams/references/teams-commands.md` | Full Teams reference |
| `skills/m365-agent/sub-skills/m365-sharepoint/SKILL.md` | SharePoint + Files workflows |
| `skills/m365-agent/sub-skills/m365-sharepoint/references/sharepoint-commands.md` | Full SharePoint reference |

### Step 5: Integration & Publishing
- Add `"./agent"` export to `package.json`
- Add type declarations for agent module
- Prerequisites in each skill for installation
- Publish skills pack as standalone GitHub repo

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

### Files We Directly Reuse (the auth/request core)
| File | Lines | What It Does | How We Use It |
|---|---|---|---|
| `src/Auth.ts` | 1,042 | Token acquisition (8 auth flows), MSAL, multi-cloud | Import `auth` singleton, call `ensureAccessToken()` |
| `src/request.ts` | 254 | HTTP client, auto-auth injection, throttle retry | Import `request`, call `get/post/patch/delete()` |
| `src/auth/FileTokenStorage.ts` | ~30 | Token persistence to OS-specific location | Tokens persist between sessions |
| `src/auth/msalCachePlugin.ts` | ~20 | MSAL cache hooks | Refresh tokens survive restarts |
| `src/auth/MsalNetworkClient.ts` | ~40 | Custom network client for MSAL | Used internally by Auth |
| `src/utils/odata.ts` | ~50 | OData pagination (`@odata.nextLink` following) | `getAllItems()` for paginated Graph responses |
| `src/utils/accessToken.ts` | ~80 | JWT payload parsing (tenant, user, app-only check) | Token validation in agent layer |

### Files We Reference But Don't Import
| File | Why We Reference It |
|---|---|
| `src/Command.ts` | Understand error patterns to replicate in agent layer |
| `src/m365/base/GraphCommand.ts` | Understand Graph API URL patterns |
| `src/m365/commands/login.ts` | Understand login flow (agent relies on `m365 login`) |
| `src/chili/chili.ts` | Keeping as-is (different purpose: human doc Q&A) |

### Auth Flow: How `m365 login` → Agent Tools Share Sessions
```
User runs: m365 login
  → Auth.ts acquires token via device code flow
  → Token stored in FileTokenStorage (~/.config/configstore/.cli-m365-connection.json)
  → MSAL cache stored in ~/.config/configstore/.cli-m365-msal.json

Agent tool runs: new GraphClient().ensureAuth()
  → auth.restoreAuth() loads SAME token files
  → auth.ensureAccessToken('https://graph.microsoft.com') refreshes if needed
  → request.get() injects Bearer token automatically
  → Same session, zero extra auth setup
```
