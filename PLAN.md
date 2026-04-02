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
├── m365-agent/                         # Parent skill pack
│   ├── SKILL.md                        # Navigator/router skill
│   ├── references/
│   │   ├── command-cheatsheet.md       # Quick reference for all domains
│   │   └── auth-troubleshooting.md     # Common auth issues
│   └── sub-skills/
│       ├── m365-mail/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── outlook-commands.md
│       ├── m365-teams/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── teams-commands.md
│       └── m365-sharepoint/
│           ├── SKILL.md
│           └── references/
│               └── sharepoint-commands.md
```

### 2.2 Navigator Skill (`skills/m365-agent/SKILL.md`)

```yaml
---
name: m365-agent
description: >
  Navigates and operates Microsoft 365 services (Outlook mail, Teams, SharePoint)
  using cli-microsoft365. Use when user mentions 'microsoft 365', 'm365', 'office 365',
  'outlook', 'email', 'teams', 'sharepoint', or asks to interact with any Microsoft
  cloud service. Routes to domain-specific sub-skills.
metadata:
  author: cli-microsoft365
  version: 1.0.0
  category: productivity
---
```

**Navigator instructions:**
1. Check auth: `m365 status --output json` (is user logged in?)
2. Route to domain sub-skill based on intent
3. For cross-domain workflows, orchestrate between sub-skills
4. For unknown commands, use `m365 agent search --query "<user intent>"`

### 2.3 Mail Sub-Skill (`skills/m365-agent/sub-skills/m365-mail/SKILL.md`)

```yaml
---
name: m365-mail
description: >
  Manages Outlook email in Microsoft 365. Read inbox, send emails, search messages,
  manage folders. Use when user mentions 'email', 'mail', 'inbox', 'send message',
  'outlook', or asks to check/manage messages. NOT for calendar or contacts.
metadata:
  version: 1.0.0
  category: productivity
---
```

**Workflows documented:**
- **Read inbox**: `m365 outlook mail list --top 10 --output json` → parse, summarize
- **Send email**: `m365 outlook mail send --to "email" --subject "..." --bodyContents "..." --bodyContentType Text`
- **Search**: `m365 outlook mail list --filter "contains(subject,'keyword')" --output json`
- **Get full email**: `m365 outlook mail get --id <id> --output json`
- **With attachments**: `m365 outlook mail send --to "..." --attachment <path>`

**Error handling section:**
- Auth errors → "Run `m365 login` first"
- Permission errors → "Need Mail.Read or Mail.Send consent"
- Not found → "Verify message ID with `outlook mail list`"

### 2.4 Teams Sub-Skill (`skills/m365-agent/sub-skills/m365-teams/SKILL.md`)

**Workflows:**
- List teams/channels: `m365 teams team list`, `m365 teams channel list --teamId <id>`
- Send message: `m365 teams message send --teamId <id> --channelId <id> --message "..."`
- Get messages: `m365 teams message list --teamId <id> --channelId <id>`
- Manage members: `m365 teams member list/add/remove`

### 2.5 SharePoint Sub-Skill (`skills/m365-agent/sub-skills/m365-sharepoint/SKILL.md`)

**Workflows:**
- Browse sites: `m365 spo site list --output json`
- List files: `m365 spo file list --webUrl <url> --folderUrl <path>`
- Upload file: `m365 spo file add --webUrl <url> --folder <path> --path <local>`
- Download: `m365 spo file get --webUrl <url> --url <fileUrl> --asFile --path <local>`
- List items: `m365 spo listitem list --webUrl <url> --listTitle <title>`

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
