---
name: m365-agent
description: >
  Operates Microsoft 365 as an AI employee. Manages email, calendar, Teams,
  OneDrive/SharePoint files, Planner/To Do tasks, contacts, and cross-domain search.
  Use when user mentions email, mail, inbox, outlook, calendar, meeting, schedule,
  teams, channel, chat, sharepoint, onedrive, file, upload, planner, todo, task,
  contact, people, microsoft 365, m365, or asks to manage their work day.
metadata:
  author: cli-microsoft365
  version: 1.0.0
  category: productivity
  tags: [microsoft-365, outlook, teams, sharepoint, planner, graph-api]
---

# Microsoft 365 Agent

Operate Microsoft 365 like a human employee via `m365 agent` CLI commands.

## Setup

```bash
npm install -g @pnp/cli-microsoft365
m365 login
m365 agent status   # verify connection + available modules
```

## Quick Start

Three commands to verify everything works:

```bash
m365 agent status                                          # Check connection
m365 agent execute --module mail --operation getUnreadCount # Read email count
m365 agent search --module calendar                        # List calendar operations
```

## Command Pattern

```bash
# Execute any operation
m365 agent execute --module <module> --operation <operation> --params '<json>'

# Discover operations
m365 agent search --query "send email"
m365 agent search --module calendar
```

## Module Quick Reference

| Module | Operations | When to use |
|--------|-----------|-------------|
| mail | listInbox, sendMail, searchMail, moveMessage, bulkMove | Email: read, send, organize, triage |
| calendar | getToday, createEvent, findMeetingTimes, getSchedule | Scheduling, meetings, availability |
| teams | sendChannelMessage, listChats, createOnlineMeeting | Chat, channels, meetings, presence |
| files | listRootFiles, uploadSmallFile, searchFiles, createSharingLink | OneDrive/SharePoint file management |
| tasks | createTask, createPlannerTask, completeTask, assignPlannerTask | To Do lists, Planner boards |
| people | searchPeople, getUserProfile, getUserManager, listContacts | Find people, org chart, contacts |
| search | searchAll, searchByEntityType, searchWithFilters | Cross-domain content discovery |

## Intent Routing

Map the user's intent to the right module and operation:

**Email**
- "Check my email" → `mail.listInbox`
- "Send an email to..." → `mail.sendMail`
- "How many unread?" → `mail.getUnreadCount`
- "Find emails about..." → `mail.searchMail`
- "Archive old messages" → `mail.bulkMove`
- For full mail reference: read [references/mail.md](references/mail.md)

**Calendar**
- "What's on my calendar today?" → `calendar.getToday`
- "Schedule a meeting with..." → `calendar.findMeetingTimes` then `calendar.createEvent`
- "Am I free on Friday?" → `calendar.getSchedule`
- "Accept/decline the invite" → `calendar.acceptEvent` / `calendar.declineEvent`
- For full calendar reference: read [references/calendar.md](references/calendar.md)

**Teams**
- "Post in #general" → `teams.sendChannelMessage`
- "Show my recent chats" → `teams.listChats`
- "Set up a Teams meeting" → `teams.createOnlineMeeting`
- "Set my status to busy" → `teams.setMyPresence`
- For full teams reference: read [references/teams.md](references/teams.md)

**Files**
- "Find the quarterly report" → `files.searchFiles` or `search.searchAll`
- "Upload this file" → `files.uploadSmallFile` (< 4MB) or `files.createUploadSession` (large)
- "Share a file with..." → `files.createSharingLink`
- "Show recent files" → `files.getRecentFiles`
- For full files reference: read [references/files.md](references/files.md)

**Tasks**
- "Create a task to..." → `tasks.createTask` (To Do) or `tasks.createPlannerTask` (Planner)
- "Show my tasks" → `tasks.listTasks` or `tasks.listTasksInPlan`
- "Mark task done" → `tasks.completeTask`
- For full tasks reference: read [references/tasks.md](references/tasks.md)

**People**
- "Who is the manager of..." → `people.getUserManager`
- "Find someone named..." → `people.searchPeople`
- For full people reference: read [references/api-reference.md](references/api-reference.md)

**Cross-domain search**
- "Find anything about..." → `search.searchAll`
- "Search emails about..." → `search.searchByEntityType` with `message`
- "Search files named..." → `search.searchByEntityType` with `driveItem`

## Decision Trees

**Uploading a file:**
- File < 4MB → `files.uploadSmallFile`
- File >= 4MB → `files.createUploadSession` then loop `files.uploadLargeFileChunk`

**Creating a task:**
- Personal task → `tasks.createTask` (Microsoft To Do)
- Team project task → `tasks.createPlannerTask` (Planner)

**Searching for content:**
- Search only emails → `mail.searchMail`
- Search only files → `files.searchFiles`
- Search everything → `search.searchAll`
- Search with filters → `search.searchWithFilters`

**Sending a message:**
- Formal/external → `mail.sendMail`
- Team channel announcement → `teams.sendChannelMessage`
- Direct message → `teams.sendChatMessage`

## Multi-Step Workflows

**Inbox triage** (Sequential Workflow pattern):
1. `mail.getUnreadCount` → check volume
2. `mail.listInbox` with `filter: "isRead eq false"` and `top: 20`
3. For each message: summarize, then `mail.markAsRead`, `mail.moveMessage`, or `mail.flagMessage`
4. Report summary to user

**Schedule a meeting** (Multi-step):
1. `calendar.findMeetingTimes` → find available slots
2. Present options to user
3. `calendar.createEvent` with chosen slot + attendees
4. Optionally `teams.createOnlineMeeting` for Teams link

**Daily briefing** (Sequential):
1. `calendar.getToday` → today's meetings
2. `mail.getUnreadCount` → unread email count
3. `tasks.listTasks` → pending tasks
4. Summarize to user

## Error Handling

All operations return structured JSON:

```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions",
    "code": "Authorization_RequestDenied",
    "suggestion": "Run: m365 login --scope Mail.Send"
  }
}
```

| Error Code | Fix |
|-----------|-----|
| `InvalidAuthenticationToken` | Run `m365 login` |
| `Authorization_RequestDenied` | Re-login with required scope |
| `Request_ResourceNotFound` | Re-list items, use fresh ID |
| `TooManyRequests` | Wait 30s, retry |

## Common Mistakes

1. **Calling createEvent without checking availability** — Use `findMeetingTimes` first to find open slots
2. **Using uploadSmallFile for large files** — Files >4MB will fail; use `createUploadSession` + `uploadLargeFileChunk` instead
3. **Forgetting etag for Planner updates** — `updatePlannerTask` and `deletePlannerTask` require If-Match header with the task's etag
4. **Not parsing params as JSON** — `--params` must be valid JSON string: `--params '{"top":5}'` not `--params top=5`
5. **Searching with wrong module** — For cross-domain search use `search.searchAll`, for email-only use `mail.searchMail`

## References

Load these only when you need detailed operation parameters:

- [references/mail.md](references/mail.md) — 27 mail operations, workflows, bulk ops
- [references/calendar.md](references/calendar.md) — 14 calendar operations, scheduling workflows
- [references/teams.md](references/teams.md) — 21 Teams operations, messaging, meetings
- [references/files.md](references/files.md) — 18 file operations, upload, sharing
- [references/tasks.md](references/tasks.md) — 17 task operations, To Do + Planner
- [references/api-reference.md](references/api-reference.md) — Complete operation catalog with all parameters
