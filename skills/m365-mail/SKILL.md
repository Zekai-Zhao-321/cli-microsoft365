---
name: m365-mail
description: >
  Manages Microsoft 365 email. Read, send, search, and organize Outlook emails.
  Use when user mentions 'email', 'mail', 'inbox', 'send message', 'outlook',
  'unread', 'attachment', 'forward', 'reply', or asks to check/manage their messages.
metadata:
  author: cli-microsoft365
  version: 1.0.0
  category: productivity
---

# M365 Mail

Full email management via the `mail` module of the M365 agent layer.

## Operations Overview (27 total)

| Category       | Operations                                                                 |
|----------------|----------------------------------------------------------------------------|
| Read & List    | listInbox, getMessage, getUnreadCount, listFolders, listAttachments, getAttachment |
| Search         | searchMail                                                                 |
| Send & Compose | sendMail, createDraft, replyToMessage, replyAllToMessage, forwardMessage, addAttachment |
| Organize       | markAsRead, markAsUnread, flagMessage, unflagMessage, categorizeMessage, moveMessage, deleteMessage, createFolder, deleteFolder |
| Bulk           | bulkMove, bulkMarkRead, bulkDelete                                         |
| Rules          | listRules, createRule, deleteRule, listCategories, createCategory          |

## Workflow: Inbox Triage

1. List unread messages and count:

```bash
m365 agent execute --module mail --operation getUnreadCount

m365 agent execute --module mail --operation listInbox \
  --params '{"filter":"isRead eq false","top":20,"select":["id","subject","from","receivedDateTime"]}'
```

2. Read a specific message:

```bash
m365 agent execute --module mail --operation getMessage \
  --params '{"id":"<messageId>"}'
```

3. Act on each message — mark read, flag, or move:

```bash
# Mark as read
m365 agent execute --module mail --operation markAsRead \
  --params '{"id":"<messageId>"}'

# Flag for follow-up
m365 agent execute --module mail --operation flagMessage \
  --params '{"id":"<messageId>"}'

# Move to a folder
m365 agent execute --module mail --operation moveMessage \
  --params '{"id":"<messageId>","destinationId":"<folderId>"}'
```

4. Bulk-triage a batch of messages:

```bash
m365 agent execute --module mail --operation bulkMarkRead \
  --params '{"messageIds":["<id1>","<id2>","<id3>"]}'
```

## Workflow: Send an Email

```bash
# Plain text
m365 agent execute --module mail --operation sendMail \
  --params '{
    "to": ["alice@contoso.com"],
    "subject": "Q2 Report",
    "body": "Hi Alice, please find the report attached.",
    "cc": ["bob@contoso.com"],
    "importance": "high"
  }'

# HTML body
m365 agent execute --module mail --operation sendMail \
  --params '{
    "to": ["alice@contoso.com"],
    "subject": "Weekly Update",
    "body": "<h1>Update</h1><p>All green.</p>",
    "bodyType": "HTML"
  }'

# With attachment (base64-encoded content)
m365 agent execute --module mail --operation sendMail \
  --params '{
    "to": ["alice@contoso.com"],
    "subject": "Document",
    "body": "See attached.",
    "attachments": [{"name":"report.pdf","contentBytes":"<base64>"}]
  }'
```

## Workflow: Search Mail

```bash
# Free-text search
m365 agent execute --module mail --operation searchMail \
  --params '{"query":"budget Q1","top":10}'

# Search by sender
m365 agent execute --module mail --operation searchMail \
  --params '{"query":"from:alice@contoso.com project kickoff"}'

# Search by subject and date range (KQL syntax)
m365 agent execute --module mail --operation searchMail \
  --params '{"query":"subject:invoice received>=2026-01-01"}'
```

## Workflow: Reply and Forward

```bash
# Reply to sender
m365 agent execute --module mail --operation replyToMessage \
  --params '{"id":"<messageId>","comment":"Thanks, noted."}'

# Reply all
m365 agent execute --module mail --operation replyAllToMessage \
  --params '{"id":"<messageId>","comment":"Looping in the team."}'

# Forward
m365 agent execute --module mail --operation forwardMessage \
  --params '{"id":"<messageId>","to":["mgr@contoso.com"],"comment":"FYI"}'
```

## Workflow: Organize with Folders

```bash
# List all folders
m365 agent execute --module mail --operation listFolders

# Create a folder
m365 agent execute --module mail --operation createFolder \
  --params '{"displayName":"Archive 2026"}'

# Create a subfolder
m365 agent execute --module mail --operation createFolder \
  --params '{"displayName":"Q1","parentFolderId":"<folderId>"}'
```

## Workflow: Inbox Rules

```bash
# List rules
m365 agent execute --module mail --operation listRules

# Create a rule: move emails from newsletter@example.com to "Newsletters" folder
m365 agent execute --module mail --operation createRule \
  --params '{
    "displayName": "Move newsletters",
    "conditions": {
      "senderContains": ["newsletter@example.com"]
    },
    "actions": {
      "moveToFolder": "<newsletterFolderId>"
    }
  }'
```

## Operation Routing

| User intent                         | Operation                              |
|-------------------------------------|----------------------------------------|
| "How many unread emails?"           | getUnreadCount                         |
| "Show my inbox"                     | listInbox                              |
| "Read that email"                   | getMessage                             |
| "Send an email to..."               | sendMail                               |
| "Draft an email"                    | createDraft                            |
| "Reply to that"                     | replyToMessage                         |
| "Forward it to..."                  | forwardMessage                         |
| "Search for emails about..."        | searchMail                             |
| "Flag this email"                   | flagMessage                            |
| "Move to folder"                    | moveMessage                            |
| "Delete it"                         | deleteMessage                          |
| "Mark all as read"                  | bulkMarkRead                           |
| "Show my folders"                   | listFolders                            |
| "Create a folder called..."         | createFolder                           |
| "Show email rules"                  | listRules                              |

## Error Handling

| Situation                          | Likely cause                        | Fix                                        |
|------------------------------------|-------------------------------------|--------------------------------------------|
| `Authorization_RequestDenied`      | Missing `Mail.Read` or `Mail.Send`  | Re-run `m365 login` with the right scope   |
| `Request_ResourceNotFound`         | Stale message/folder ID             | Re-list to get current IDs                 |
| `ErrorMimeContentInvalidBase64String` | Bad attachment encoding          | Ensure content is valid base64             |
| `TooManyRequests`                  | Sending too many requests           | Add delay; use bulk operations             |
