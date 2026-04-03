# M365 Agent — Complete Operation Reference

Full catalog of all operations available through the `m365 agent execute` command, organized by module.

---

## mail (MailOperations) — 27 operations

### Read & List

| Operation       | Required Params             | Optional Params                          | Description                          |
|-----------------|-----------------------------|------------------------------------------|--------------------------------------|
| `listInbox`     | —                           | `top`, `filter`, `select[]`              | List messages from inbox             |
| `getMessage`    | `id`                        | —                                        | Get a single message by ID           |
| `getUnreadCount`| —                           | —                                        | Count of unread messages in inbox    |
| `listFolders`   | —                           | —                                        | List all mail folders                |
| `listAttachments`| `messageId`                | —                                        | List attachments on a message        |
| `getAttachment` | `messageId`, `attachmentId` | —                                        | Get a specific attachment            |

### Search

| Operation    | Required Params | Optional Params | Description                                  |
|--------------|-----------------|-----------------|----------------------------------------------|
| `searchMail` | `query`         | `top`           | Full-text search across mailbox (Graph Search API) |

### Send & Compose

| Operation         | Required Params                    | Optional Params                                        | Description                     |
|-------------------|------------------------------------|--------------------------------------------------------|---------------------------------|
| `sendMail`        | `to[]`, `subject`, `body`          | `bodyType`, `cc[]`, `bcc[]`, `importance`, `attachments[]`, `saveToSentItems` | Send an email immediately |
| `createDraft`     | `to[]`, `subject`, `body`          | `bodyType`                                             | Save a draft (does not send)    |
| `replyToMessage`  | `id`, `comment`                    | —                                                      | Reply to sender only            |
| `replyAllToMessage`| `id`, `comment`                   | —                                                      | Reply to all recipients         |
| `forwardMessage`  | `id`, `to[]`                       | `comment`                                              | Forward a message               |
| `addAttachment`   | `messageId`, `attachment`          | —                                                      | Add attachment to a draft       |

### Organize

| Operation           | Required Params              | Optional Params      | Description                           |
|---------------------|------------------------------|----------------------|---------------------------------------|
| `markAsRead`        | `id`                         | —                    | Mark message as read                  |
| `markAsUnread`      | `id`                         | —                    | Mark message as unread                |
| `flagMessage`       | `id`                         | —                    | Flag a message for follow-up          |
| `unflagMessage`     | `id`                         | —                    | Remove flag from message              |
| `categorizeMessage` | `id`, `categories[]`         | —                    | Apply category labels                 |
| `moveMessage`       | `id`, `destinationId`        | —                    | Move message to another folder        |
| `deleteMessage`     | `id`                         | —                    | Delete a message                      |
| `createFolder`      | `displayName`                | `parentFolderId`     | Create a mail folder                  |
| `deleteFolder`      | `id`                         | —                    | Delete a mail folder                  |

### Bulk Operations

| Operation       | Required Params                   | Optional Params | Description                        |
|-----------------|-----------------------------------|-----------------|------------------------------------|
| `bulkMove`      | `messageIds[]`, `destinationId`   | —               | Move multiple messages (batch API) |
| `bulkMarkRead`  | `messageIds[]`                    | —               | Mark multiple messages as read     |
| `bulkDelete`    | `messageIds[]`                    | —               | Delete multiple messages           |

### Rules & Categories

| Operation        | Required Params                          | Optional Params | Description              |
|------------------|------------------------------------------|-----------------|--------------------------|
| `listRules`      | —                                        | —               | List inbox message rules |
| `createRule`     | `displayName`, `conditions`, `actions`   | —               | Create an inbox rule     |
| `deleteRule`     | `id`                                     | —               | Delete an inbox rule     |
| `listCategories` | —                                        | —               | List Outlook categories  |
| `createCategory` | `displayName`, `color`                   | —               | Create an Outlook category |

---

## calendar (CalendarOperations) — 13 operations

| Operation               | Required Params                         | Optional Params                          | Description                                |
|-------------------------|-----------------------------------------|------------------------------------------|--------------------------------------------|
| `listEvents`            | —                                       | `startDate`, `endDate`, `top`, `select[]`| List calendar events with optional filters |
| `getEvent`              | `id`                                    | —                                        | Get a single event by ID                   |
| `getCalendarView`       | `startDateTime`, `endDateTime`          | `top`                                    | Get events in a date/time range            |
| `getToday`              | —                                       | —                                        | Get all events for today                   |
| `getThisWeek`           | —                                       | —                                        | Get events for the current Mon–Sun week    |
| `getUpcoming`           | —                                       | `hours` (default 24)                     | Get events in the next N hours             |
| `createEvent`           | `event` (object)                        | —                                        | Create a new calendar event                |
| `updateEvent`           | `id`, `updates` (object)               | —                                        | Update an existing event                   |
| `deleteEvent`           | `id`                                    | —                                        | Delete an event                            |
| `acceptEvent`           | `id`                                    | `comment`, `sendResponse`                | Accept a meeting invitation                |
| `declineEvent`          | `id`                                    | `comment`, `sendResponse`                | Decline a meeting invitation               |
| `tentativelyAcceptEvent`| `id`                                    | `comment`, `sendResponse`                | Tentatively accept an invitation           |
| `findMeetingTimes`      | `params` (object)                       | —                                        | Find available meeting time slots          |
| `getSchedule`           | `emails[]`, `startDate`, `endDate`      | `availabilityViewInterval`               | Get free/busy schedule for attendees       |

### createEvent body shape

```json
{
  "subject": "Team Sync",
  "start": { "dateTime": "2026-04-10T14:00:00", "timeZone": "UTC" },
  "end":   { "dateTime": "2026-04-10T15:00:00", "timeZone": "UTC" },
  "attendees": [
    { "emailAddress": { "address": "alice@contoso.com" }, "type": "required" }
  ],
  "isOnlineMeeting": true,
  "onlineMeetingProvider": "teamsForBusiness",
  "body": { "contentType": "HTML", "content": "<p>Agenda...</p>" }
}
```

---

## teams (TeamsOperations) — 18 operations

### Teams & Channels

| Operation             | Required Params                                    | Optional Params      | Description                              |
|-----------------------|----------------------------------------------------|----------------------|------------------------------------------|
| `listMyTeams`         | —                                                  | `opts`               | List all teams the user belongs to       |
| `getTeam`             | `teamId`                                           | —                    | Get team details                         |
| `createTeam`          | `displayName`                                      | `description`, `template` | Create a new team                  |
| `archiveTeam`         | `teamId`                                           | —                    | Archive a team                           |
| `listChannels`        | `teamId`                                           | `opts`               | List channels in a team                  |
| `getChannel`          | `teamId`, `channelId`                              | —                    | Get channel details                      |
| `createChannel`       | `teamId`, `displayName`                            | `description`, `membershipType` | Create a new channel          |

### Channel Messages

| Operation                | Required Params                                       | Optional Params  | Description                          |
|--------------------------|-------------------------------------------------------|------------------|--------------------------------------|
| `listChannelMessages`    | `teamId`, `channelId`                                 | `opts`           | List messages in a channel           |
| `sendChannelMessage`     | `teamId`, `channelId`, `content`                      | `contentType`    | Post a message to a channel          |
| `replyToChannelMessage`  | `teamId`, `channelId`, `messageId`, `content`         | `contentType`    | Reply to a channel message           |

### Chats

| Operation         | Required Params         | Optional Params | Description                    |
|-------------------|-------------------------|-----------------|--------------------------------|
| `listChats`       | —                       | `opts`          | List all user chats            |
| `getChat`         | `chatId`                | —               | Get a specific chat            |
| `listChatMessages`| `chatId`                | `opts`          | List messages in a chat        |
| `sendChatMessage` | `chatId`, `content`     | `contentType`   | Send a message to a chat       |

### Members

| Operation         | Required Params                 | Optional Params | Description                       |
|-------------------|---------------------------------|-----------------|-----------------------------------|
| `listTeamMembers` | `teamId`                        | `opts`          | List team members                 |
| `addTeamMember`   | `teamId`, `userId`              | `role`          | Add a member to a team            |
| `removeTeamMember`| `teamId`, `membershipId`        | —               | Remove a member from a team       |

### Online Meetings & Presence

| Operation                     | Required Params                                   | Optional Params        | Description                           |
|-------------------------------|---------------------------------------------------|------------------------|---------------------------------------|
| `listOnlineMeetings`          | —                                                 | `opts`                 | List the user's online meetings       |
| `createOnlineMeeting`         | `subject`, `startDateTime`, `endDateTime`         | —                      | Create a Teams online meeting         |
| `getMeetingTranscript`        | `meetingId`, `transcriptId`                       | —                      | Retrieve transcript content           |
| `listMeetingAttendanceReports`| `meetingId`                                       | `opts`                 | List attendance reports for a meeting |
| `getMyPresence`               | —                                                 | —                      | Get the authenticated user's presence |
| `getUserPresence`             | `userId`                                          | —                      | Get another user's presence           |
| `setMyPresence`               | `availability`, `activity`                        | `expirationDuration`   | Set the user's presence status        |

---

## files (FilesOperations) — 18 operations

### Browse & Read

| Operation                 | Required Params               | Optional Params                 | Description                                     |
|---------------------------|-------------------------------|---------------------------------|-------------------------------------------------|
| `listRootFiles`           | —                             | `driveId`, `select[]`, `top`    | List files at OneDrive root (or specific drive) |
| `listFolderFiles`         | `folderId`                    | `select[]`, `top`               | List files inside a folder                      |
| `listSharePointDriveFiles`| `siteId`, `driveId`           | `folderId`                      | List files in a SharePoint drive                |
| `getFileById`             | `itemId`                      | `select[]`                      | Get file metadata by ID                         |
| `getFileByPath`           | `path`                        | `select[]`                      | Get file metadata by OneDrive path              |
| `downloadFile`            | `itemId`                      | `select[]`                      | Get download URL / content for a file           |
| `getRecentFiles`          | —                             | —                               | List recently accessed files                    |
| `getSharedWithMe`         | —                             | —                               | List files shared with the user                 |

### Upload

| Operation             | Required Params                                          | Optional Params | Description                                |
|-----------------------|----------------------------------------------------------|-----------------|--------------------------------------------|
| `uploadSmallFile`     | `parentFolderId`, `fileName`, `content` (Buffer)         | —               | Upload a file under 4 MB                   |
| `createUploadSession` | `parentFolderId`, `fileName`                             | —               | Begin a resumable upload session for large files |
| `uploadLargeFileChunk`| `uploadUrl`, `chunk`, `rangeStart`, `rangeEnd`, `totalSize` | —            | Upload one chunk of a large file           |

### Manage

| Operation         | Required Params                    | Optional Params | Description                            |
|-------------------|------------------------------------|-----------------|----------------------------------------|
| `createFolder`    | `parentFolderId`, `name`           | —               | Create a new folder                    |
| `deleteItem`      | `itemId`                           | —               | Delete a file or folder                |
| `moveItem`        | `itemId`, `newParentId`            | —               | Move a file to another folder          |
| `copyItem`        | `itemId`, `newParentId`            | —               | Copy a file to another folder          |

### Search & Share

| Operation           | Required Params        | Optional Params         | Description                                   |
|---------------------|------------------------|-------------------------|-----------------------------------------------|
| `searchFiles`       | `query`                | `select[]`, `top`       | Search OneDrive for files matching a query    |
| `createSharingLink` | `itemId`, `type`, `scope` | —                    | Create a sharing link (view/edit, org/anonymous) |

### Versioning

| Operation           | Required Params          | Optional Params | Description                         |
|---------------------|--------------------------|-----------------|-------------------------------------|
| `listFileVersions`  | `itemId`                 | `select[]`      | List version history of a file      |
| `restoreFileVersion`| `itemId`, `versionId`    | —               | Restore a file to a previous version|

---

## tasks (TasksOperations) — 14 operations

### Microsoft To Do — Task Lists

| Operation        | Required Params  | Optional Params | Description                         |
|------------------|------------------|-----------------|-------------------------------------|
| `listTaskLists`  | —                | —               | List all To Do task lists            |
| `getTaskList`    | `listId`         | —               | Get a specific task list             |
| `createTaskList` | `displayName`    | —               | Create a new task list               |

### Microsoft To Do — Tasks

| Operation      | Required Params             | Optional Params                                                      | Description                       |
|----------------|-----------------------------|----------------------------------------------------------------------|-----------------------------------|
| `listTasks`    | `listId`                    | `opts`                                                               | List tasks in a task list         |
| `getTask`      | `listId`, `taskId`          | —                                                                    | Get a specific task               |
| `createTask`   | `listId`, `title`           | `body`, `dueDateTime`, `importance`, `reminderDateTime`              | Create a task in a list           |
| `updateTask`   | `listId`, `taskId`, `updates` | —                                                                  | Update a task's properties        |
| `completeTask` | `listId`, `taskId`          | —                                                                    | Mark a task as completed          |
| `deleteTask`   | `listId`, `taskId`          | —                                                                    | Delete a task                     |

### Planner — Plans & Buckets

| Operation           | Required Params | Optional Params | Description                           |
|---------------------|-----------------|-----------------|---------------------------------------|
| `listPlansForGroup` | `groupId`       | —               | List Planner plans in a group         |
| `getPlan`           | `planId`        | —               | Get plan details                      |
| `listBuckets`       | `planId`        | —               | List buckets (columns) in a plan      |

### Planner — Tasks

| Operation            | Required Params                           | Optional Params                | Description                        |
|----------------------|-------------------------------------------|--------------------------------|------------------------------------|
| `listTasksInPlan`    | `planId`                                  | —                              | List all tasks in a Planner plan   |
| `getPlannerTask`     | `taskId`                                  | —                              | Get a specific Planner task        |
| `createPlannerTask`  | `planId`, `bucketId`, `title`             | `dueDateTime`, `assignments`   | Create a task in a Planner bucket  |
| `updatePlannerTask`  | `taskId`, `updates`, `etag`               | —                              | Update a Planner task (etag required) |
| `deletePlannerTask`  | `taskId`, `etag`                          | —                              | Delete a Planner task              |
| `assignPlannerTask`  | `taskId`, `userId`, `etag`                | —                              | Assign a Planner task to a user    |

---

## people (PeopleOperations) — 10 operations

| Operation              | Required Params  | Optional Params | Description                                      |
|------------------------|------------------|-----------------|--------------------------------------------------|
| `listRelevantPeople`   | —                | `top`           | List people relevant to the signed-in user       |
| `searchPeople`         | `query`          | `top`           | Search the user's people graph by name           |
| `listContacts`         | —                | `top`           | List personal contacts                           |
| `getContact`           | `contactId`      | —               | Get a specific contact                           |
| `createContact`        | (contact data)   | —               | Create a personal contact                        |
| `updateContact`        | `contactId`, (updates) | —         | Update a contact                                 |
| `deleteContact`        | `contactId`      | —               | Delete a contact                                 |
| `getUserProfile`       | `idOrUpn`        | —               | Get a user's full profile from the directory     |
| `searchUsers`          | `query`          | `top`           | Search directory users by display name prefix    |
| `getUserManager`       | `idOrUpn`        | —               | Get a user's manager                             |
| `getUserDirectReports` | `idOrUpn`        | —               | Get a user's direct reports                      |
| `getUserPhoto`         | `idOrUpn`        | `size`          | Get a user's profile photo                       |

---

## search (SearchOperations) — 4 operations

| Operation              | Required Params            | Optional Params                   | Description                                        |
|------------------------|----------------------------|-----------------------------------|----------------------------------------------------|
| `searchAll`            | `query`                    | `entityTypes[]`, `top`            | Search across all content types                    |
| `searchByEntityType`   | `query`, `entityType`      | `top`                             | Search within a single entity type                 |
| `searchWithFilters`    | `query`, `filters`         | `entityTypes[]`, `top`            | Search with date range or sender filters           |
| `getSearchSuggestions` | `query`                    | `entityTypes[]`                   | Get query alteration suggestions                   |

### Entity Types

`message` | `event` | `driveItem` | `site` | `list` | `listItem`

### searchWithFilters — filters shape

```json
{
  "dateRange": { "start": "2026-01-01", "end": "2026-03-31" },
  "from": "alice@contoso.com"
}
```

---

## Common Response Shape

All operations return:

```typescript
interface GraphResponse<T> {
  success: boolean;
  data: T;
  tokenEstimate: number;
  error?: {
    message: string;
    code?: string;
    suggestion?: string;
  };
}
```

Always check `success` before using `data`. On failure, surface `error.message` and `error.suggestion` to the user.
