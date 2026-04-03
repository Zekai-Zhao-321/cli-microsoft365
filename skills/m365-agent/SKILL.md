---
name: m365-agent
description: >
  Operates Microsoft 365 as an AI employee using cli-microsoft365 agent layer.
  Manages email, calendar, Teams, files, tasks, contacts, and search.
  Use when user mentions 'email', 'mail', 'calendar', 'meeting', 'teams',
  'sharepoint', 'onedrive', 'planner', 'todo', 'task', 'outlook',
  'microsoft 365', 'm365', 'office 365', or asks to manage their work.
metadata:
  author: cli-microsoft365
  version: 1.0.0
  category: productivity
---

# Microsoft 365 Agent

You can operate Microsoft 365 like a human employee using the `m365` CLI agent commands.

## Setup

1. Install: `npm install -g @pnp/cli-microsoft365`
2. Authenticate: `m365 login`
3. Verify: `m365 agent status`

## Quick Reference

| Module   | Key Operations                                    | When to Use                           |
|----------|---------------------------------------------------|---------------------------------------|
| mail     | listInbox, sendMail, searchMail, moveMessage      | Email triage, sending, organizing     |
| calendar | getToday, createEvent, findMeetingTimes           | Scheduling, calendar management       |
| teams    | sendChannelMessage, listChats, listMyTeams        | Team communication, collaboration     |
| files    | listRootFiles, uploadSmallFile, searchFiles       | Document management, file sharing     |
| tasks    | createTask, createPlannerTask, listTasks          | Task tracking, project management     |
| people   | searchPeople, getUserProfile, listContacts        | Finding people, contact management    |
| search   | searchAll, searchByEntityType                     | Cross-domain content discovery        |

## Usage Pattern

```bash
# Discover operations
m365 agent search --query "send email"

# Execute an operation
m365 agent execute --module mail --operation sendMail \
  --params '{"to":["user@contoso.com"],"subject":"Hello","body":"Hi there"}'

# Check status
m365 agent status
```

## Module Routing

- **"Check my email"** → mail.listInbox
- **"Send an email to..."** → mail.sendMail
- **"How many unread messages?"** → mail.getUnreadCount
- **"What meetings do I have today?"** → calendar.getToday
- **"Schedule a meeting with..."** → calendar.findMeetingTimes → calendar.createEvent
- **"What's on my calendar this week?"** → calendar.getThisWeek
- **"Post in the #general channel"** → teams.sendChannelMessage
- **"Show my recent chats"** → teams.listChats
- **"Find the quarterly report"** → search.searchAll or files.searchFiles
- **"Upload a file"** → files.uploadSmallFile
- **"Share a file with..."** → files.createSharingLink
- **"Create a task to..."** → tasks.createTask (To Do) or tasks.createPlannerTask (Planner)
- **"Who is the manager of..."** → people.getUserManager
- **"Find someone named..."** → people.searchPeople or people.searchUsers

## Error Handling

All operations return structured JSON with actionable error messages:

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

Common errors and remedies:

| Error Code                    | Meaning                        | Fix                                      |
|-------------------------------|--------------------------------|------------------------------------------|
| `Authorization_RequestDenied` | Missing Graph permission scope | Re-authenticate with required scope      |
| `Request_ResourceNotFound`    | Item ID is invalid or deleted  | Re-list items and use fresh ID           |
| `TooManyRequests`             | Graph API rate limit hit       | Wait 30s and retry with exponential back-off |
| `InvalidAuthenticationToken`  | Token expired                  | Run `m365 login` again                   |

## Domain Sub-Skills

For deep workflows, load the focused skill for each domain:

- **m365-mail** — inbox triage, send with attachments, bulk operations, mail rules
- **m365-calendar** — daily briefing, meeting scheduling, RSVP handling
- **m365-teams** — channel messages, chat history, online meetings, presence
- **m365-files** — OneDrive/SharePoint browsing, upload, sharing links, versioning
- **m365-tasks** — Microsoft To Do tasks, Planner plans/buckets/assignments
