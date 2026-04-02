# M365 Agent — Comprehensive TDD Design

> AI-native Microsoft 365 toolkit. Direct Graph API client reusing cli-microsoft365 auth.
> Navigator: human (picks tests, verifies). Writer: agents (implement to pass tests).

---

## 1. File Structure

```
src/agent/
├── graph-client.ts              # Core Graph API client (wraps Auth.ts + request.ts)
├── graph-client.spec.ts         # 20+ tests
├── formatter.ts                 # Token-aware response formatting
├── formatter.spec.ts            # 20+ tests
├── index.ts                     # Public API exports
├── types.ts                     # Shared TypeScript interfaces
└── graph/
    ├── mail.ts                  # Full Outlook email experience (~35 Graph endpoints)
    ├── mail.spec.ts             # 25+ tests
    ├── calendar.ts              # Full calendar experience — NEW (~28 endpoints)
    ├── calendar.spec.ts         # 25+ tests
    ├── teams.ts                 # Full Teams experience (~40 endpoints)
    ├── teams.spec.ts            # 25+ tests
    ├── files.ts                 # OneDrive + SharePoint files (~35 endpoints)
    ├── files.spec.ts            # 20+ tests
    ├── tasks.ts                 # Planner + To Do (~30 endpoints)
    ├── tasks.spec.ts            # 20+ tests
    ├── people.ts                # People graph + Presence — NEW (~12 endpoints)
    ├── people.spec.ts           # 15+ tests
    ├── search.ts                # Unified cross-M365 search (same as Copilot)
    ├── search.spec.ts           # 15+ tests
    ├── contacts.ts              # Contacts + folders — NEW (~16 endpoints)
    └── contacts.spec.ts         # 15+ tests

src/m365/agent/
├── commands.ts                  # Command name constants
└── commands/
    ├── agent-mail.ts            # m365 agent mail <action>
    ├── agent-mail.spec.ts
    ├── agent-calendar.ts        # m365 agent calendar <action>
    ├── agent-calendar.spec.ts
    ├── agent-teams.ts           # m365 agent teams <action>
    ├── agent-teams.spec.ts
    ├── agent-files.ts           # m365 agent files <action>
    ├── agent-files.spec.ts
    ├── agent-tasks.ts           # m365 agent tasks <action>
    ├── agent-tasks.spec.ts
    ├── agent-people.ts          # m365 agent people <action>
    ├── agent-people.spec.ts
    ├── agent-search.ts          # m365 agent search
    └── agent-search.spec.ts

skills/m365-agent/
├── SKILL.md                     # Navigator/router skill
├── references/
│   ├── command-cheatsheet.md
│   ├── auth-troubleshooting.md
│   └── cross-app-workflows.md
└── sub-skills/
    ├── m365-mail/
    │   ├── SKILL.md
    │   └── references/
    │       └── outlook-commands.md
    ├── m365-teams/
    │   ├── SKILL.md
    │   └── references/
    │       └── teams-commands.md
    └── m365-sharepoint/
        ├── SKILL.md
        └── references/
            └── sharepoint-commands.md
```

---

## 2. Shared Types (`src/agent/types.ts`)

```typescript
export interface GraphResponse<T> {
  success: boolean;
  data: T;
  totalCount?: number;
  page?: number;
  hasMore?: boolean;
  error?: AgentError;
  tokenEstimate: number;
}

export interface AgentError {
  message: string;
  code?: string;
  suggestion?: string;
}

export interface GraphRequestOptions {
  select?: string[];
  filter?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
  expand?: string;
  maxTokens?: number;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface FormatterOptions {
  maxTokens?: number;
  fields?: string[];
  page?: number;
  pageSize?: number;
}

export interface FormatterResult<T> {
  formatted: T;
  tokenEstimate: number;
  truncated: boolean;
  totalCount?: number;
}
```

---

## 3. Module: GraphClient (`src/agent/graph-client.ts`)

### Design

```typescript
import auth from '../Auth.js';
import request from '../request.js';
import { GraphResponse, GraphRequestOptions, AgentError } from './types.js';

export class GraphClient {
  private resource = 'https://graph.microsoft.com';
  private version = 'v1.0';

  async ensureAuth(): Promise<boolean> {
    try {
      await auth.restoreAuth();
      return auth.connection.active;
    } catch {
      return false;
    }
  }

  async get<T>(endpoint: string, opts?: GraphRequestOptions): Promise<GraphResponse<T>> {
    // Build URL with OData query params
    // Call request.get with auth
    // Strip @odata metadata from response
    // Estimate tokens, truncate if needed
    // Translate errors to AgentError
  }

  async post<T>(endpoint: string, body: any): Promise<GraphResponse<T>> { }
  async patch<T>(endpoint: string, body: any): Promise<GraphResponse<T>> { }
  async delete(endpoint: string): Promise<GraphResponse<void>> { }

  async getAll<T>(endpoint: string, opts?: GraphRequestOptions): Promise<GraphResponse<T[]>> {
    // Follow @odata.nextLink for full pagination
  }

  // Internal helpers
  private buildUrl(endpoint: string, opts?: GraphRequestOptions): string { }
  private buildQueryString(opts: GraphRequestOptions): string { }
  private stripODataMetadata(data: any): any { }
  private estimateTokens(data: any): number { }
  private translateError(error: any): AgentError { }
}
```

### TDD Test Cases (`src/agent/graph-client.spec.ts`)

```
describe('GraphClient', () => {
  describe('ensureAuth', () => {
    it('should return true when connection is active')
    it('should return false when connection is not active')
    it('should return false when restoreAuth throws')
  })

  describe('get', () => {
    it('should make GET request to correct Graph API URL')
    it('should append $select query parameter from options')
    it('should append $filter query parameter from options')
    it('should append $top query parameter from options')
    it('should append $skip query parameter from options')
    it('should append $orderby query parameter from options')
    it('should append $expand query parameter from options')
    it('should combine multiple query parameters correctly')
    it('should strip @odata.context from response')
    it('should strip @odata.type from response items')
    it('should strip @odata.etag from response items')
    it('should estimate token count of response')
    it('should truncate response when exceeding maxTokens')
    it('should set hasMore=true when response is truncated')
    it('should return success=false with actionable error on 401')
    it('should return suggestion "Run m365 login" on auth failure')
    it('should return suggestion with required scope on 403')
    it('should return suggestion "Verify ID" on 404')
    it('should handle 429 throttling (delegated to request.ts)')
    it('should handle empty response gracefully')
    it('should handle non-JSON response gracefully')
  })

  describe('post', () => {
    it('should make POST request with JSON body')
    it('should return parsed response data')
    it('should translate error on failure')
  })

  describe('patch', () => {
    it('should make PATCH request with JSON body')
    it('should return parsed response data')
  })

  describe('delete', () => {
    it('should make DELETE request')
    it('should return success on 204 No Content')
  })

  describe('getAll', () => {
    it('should return all items from single page')
    it('should follow @odata.nextLink for multiple pages')
    it('should concatenate items from all pages')
    it('should handle empty result set')
  })

  describe('buildUrl', () => {
    it('should construct full URL from endpoint')
    it('should prepend /v1.0 when endpoint starts with /')
    it('should not double-prepend version')
  })

  describe('buildQueryString', () => {
    it('should return empty string for no options')
    it('should join select fields with comma')
    it('should URL-encode filter expressions')
  })

  describe('translateError', () => {
    it('should parse OData error format')
    it('should parse Graph error format')
    it('should provide fallback for unknown error format')
    it('should include suggestion for common error codes')
  })
})
```

---

## 4. Module: Formatter (`src/agent/formatter.ts`)

### Design

```typescript
import { FormatterOptions, FormatterResult } from './types.js';

export function formatForAgent<T>(data: T, opts?: FormatterOptions): FormatterResult<T> {
  // 1. Apply field selection (whitelist properties)
  // 2. Apply pagination (slice arrays)
  // 3. Truncate large strings (email bodies, HTML)
  // 4. Estimate tokens (~4 chars per token)
  // 5. Truncate entire response if over maxTokens
}

export function estimateTokens(data: any): number {
  // JSON.stringify length / 4
}

export function selectFields<T>(data: T, fields: string[]): Partial<T> {
  // Pick only specified fields from object or array of objects
}

export function truncateString(str: string, maxLength: number, hint?: string): string {
  // Truncate with "[truncated - X chars. {hint}]"
}

export function paginateArray<T>(arr: T[], page: number, pageSize: number): {
  items: T[];
  totalCount: number;
  page: number;
  hasMore: boolean;
} { }
```

### TDD Test Cases (`src/agent/formatter.spec.ts`)

```
describe('Formatter', () => {
  describe('formatForAgent', () => {
    it('should return data unchanged when no options provided')
    it('should select only specified fields from object')
    it('should select only specified fields from array of objects')
    it('should paginate array with page and pageSize')
    it('should return hasMore=true when more pages exist')
    it('should return hasMore=false on last page')
    it('should set totalCount to original array length')
    it('should truncate response when exceeding maxTokens')
    it('should default maxTokens to 4000')
    it('should handle nested objects in field selection')
    it('should handle null/undefined data gracefully')
    it('should handle empty array')
    it('should handle empty object')
  })

  describe('estimateTokens', () => {
    it('should estimate ~1 token per 4 characters')
    it('should handle empty string as 0 tokens')
    it('should handle objects by stringifying first')
    it('should handle arrays')
    it('should handle null/undefined as 0 tokens')
  })

  describe('selectFields', () => {
    it('should pick specified fields from flat object')
    it('should ignore fields that do not exist')
    it('should apply to each item in an array')
    it('should handle dot-notation for nested fields')
    it('should return empty object when no fields match')
  })

  describe('truncateString', () => {
    it('should not truncate strings under maxLength')
    it('should truncate strings over maxLength')
    it('should append truncation hint')
    it('should include original length in truncation message')
    it('should handle HTML content truncation')
  })

  describe('paginateArray', () => {
    it('should return correct slice for page 1')
    it('should return correct slice for page 2')
    it('should return empty array for page beyond data')
    it('should handle pageSize larger than array')
    it('should default to page 1, pageSize 10')
  })
})
```

---

## 5. Module: Mail Operations (`src/agent/graph/mail.ts`)

### Design

```typescript
import { GraphClient } from '../graph-client.js';
import { GraphResponse } from '../types.js';

export class MailOperations {
  constructor(private client: GraphClient) {}

  // --- Inbox ---
  async listInbox(opts?: { top?: number; filter?: string; select?: string[] }): Promise<GraphResponse<Message[]>>
  async getMessage(id: string): Promise<GraphResponse<Message>>
  async getUnreadCount(): Promise<GraphResponse<number>>

  // --- Compose ---
  async sendMail(params: {
    to: string[]; subject: string; body: string;
    cc?: string[]; bcc?: string[]; bodyType?: 'Text' | 'HTML';
    attachments?: { name: string; contentBytes: string }[];
    importance?: 'low' | 'normal' | 'high';
    saveToSentItems?: boolean;
  }): Promise<GraphResponse<void>>
  async createDraft(params: { to: string[]; subject: string; body: string }): Promise<GraphResponse<Message>>
  async replyToMessage(id: string, comment: string): Promise<GraphResponse<void>>
  async replyAllToMessage(id: string, comment: string): Promise<GraphResponse<void>>
  async forwardMessage(id: string, to: string[], comment?: string): Promise<GraphResponse<void>>

  // --- Organize ---
  async moveMessage(id: string, destinationFolder: string): Promise<GraphResponse<Message>>
  async deleteMessage(id: string): Promise<GraphResponse<void>>
  async markAsRead(id: string): Promise<GraphResponse<void>>
  async markAsUnread(id: string): Promise<GraphResponse<void>>
  async flagMessage(id: string): Promise<GraphResponse<void>>
  async unflagMessage(id: string): Promise<GraphResponse<void>>
  async categorizeMessage(id: string, categories: string[]): Promise<GraphResponse<void>>

  // --- Search ---
  async searchMail(query: string, opts?: { top?: number }): Promise<GraphResponse<Message[]>>

  // --- Folders ---
  async listFolders(): Promise<GraphResponse<MailFolder[]>>
  async createFolder(displayName: string, parentFolderId?: string): Promise<GraphResponse<MailFolder>>
  async deleteFolder(id: string): Promise<GraphResponse<void>>

  // --- Attachments ---
  async listAttachments(messageId: string): Promise<GraphResponse<Attachment[]>>
  async getAttachment(messageId: string, attachmentId: string): Promise<GraphResponse<Attachment>>
  async addAttachment(messageId: string, attachment: { name: string; contentBytes: string }): Promise<GraphResponse<Attachment>>

  // --- Bulk (Copilot can't do this) ---
  async bulkMove(messageIds: string[], destinationFolder: string): Promise<GraphResponse<{ moved: number }>>
  async bulkMarkRead(messageIds: string[]): Promise<GraphResponse<{ updated: number }>>
  async bulkDelete(messageIds: string[]): Promise<GraphResponse<{ deleted: number }>>

  // --- Rules ---
  async listRules(): Promise<GraphResponse<MessageRule[]>>
  async createRule(rule: { displayName: string; conditions: any; actions: any }): Promise<GraphResponse<MessageRule>>
  async deleteRule(id: string): Promise<GraphResponse<void>>

  // --- Categories ---
  async listCategories(): Promise<GraphResponse<OutlookCategory[]>>
  async createCategory(displayName: string, color: string): Promise<GraphResponse<OutlookCategory>>
}
```

### Graph API Mapping

| Method | Endpoint | HTTP |
|---|---|---|
| listInbox | `/me/messages` | GET |
| getMessage | `/me/messages/{id}` | GET |
| getUnreadCount | `/me/mailFolders/inbox` → unreadItemCount | GET |
| sendMail | `/me/sendMail` | POST |
| createDraft | `/me/messages` | POST |
| replyToMessage | `/me/messages/{id}/reply` | POST |
| replyAllToMessage | `/me/messages/{id}/replyAll` | POST |
| forwardMessage | `/me/messages/{id}/forward` | POST |
| moveMessage | `/me/messages/{id}/move` | POST |
| deleteMessage | `/me/messages/{id}` | DELETE |
| markAsRead | `/me/messages/{id}` (isRead=true) | PATCH |
| flagMessage | `/me/messages/{id}` (flag) | PATCH |
| categorizeMessage | `/me/messages/{id}` (categories) | PATCH |
| searchMail | `/search/query` entityTypes=message | POST |
| listFolders | `/me/mailFolders` | GET |
| createFolder | `/me/mailFolders` | POST |
| listAttachments | `/me/messages/{id}/attachments` | GET |
| getAttachment | `/me/messages/{id}/attachments/{attId}` | GET |
| addAttachment | `/me/messages/{id}/attachments` | POST |
| bulkMove | batch `/me/messages/{id}/move` x N | POST |
| bulkMarkRead | batch `/me/messages/{id}` PATCH x N | POST |
| bulkDelete | batch `/me/messages/{id}` DELETE x N | POST |
| listRules | `/me/mailFolders/inbox/messageRules` | GET |
| createRule | `/me/mailFolders/inbox/messageRules` | POST |
| listCategories | `/me/outlook/masterCategories` | GET |
| createCategory | `/me/outlook/masterCategories` | POST |

### TDD Test Cases (`src/agent/graph/mail.spec.ts`)

```
describe('MailOperations', () => {
  describe('listInbox', () => {
    it('should list messages from /me/messages')
    it('should pass $top parameter')
    it('should pass $filter parameter')
    it('should pass $select parameter')
    it('should return empty array when inbox is empty')
    it('should handle auth error with actionable suggestion')
  })

  describe('getMessage', () => {
    it('should get single message by ID')
    it('should return full message body')
    it('should return 404 error with suggestion to list messages first')
  })

  describe('getUnreadCount', () => {
    it('should return unread count from inbox folder')
    it('should return 0 when no unread messages')
  })

  describe('sendMail', () => {
    it('should send plain text email')
    it('should send HTML email')
    it('should send email with CC and BCC')
    it('should send email with attachments')
    it('should set importance level')
    it('should default saveToSentItems to true')
    it('should handle permission error with Mail.Send scope suggestion')
  })

  describe('createDraft', () => {
    it('should create draft message')
    it('should return draft with ID for later sending')
  })

  describe('replyToMessage', () => {
    it('should reply to message with comment')
    it('should handle invalid message ID')
  })

  describe('forwardMessage', () => {
    it('should forward message to recipients')
    it('should include optional comment')
  })

  describe('moveMessage', () => {
    it('should move message to destination folder')
    it('should accept well-known folder names like "archive"')
    it('should handle invalid folder ID')
  })

  describe('deleteMessage', () => {
    it('should delete message by ID')
    it('should return success on 204')
  })

  describe('markAsRead', () => {
    it('should patch message with isRead=true')
  })

  describe('flagMessage', () => {
    it('should patch message with flag status flagged')
  })

  describe('categorizeMessage', () => {
    it('should patch message with category array')
  })

  describe('searchMail', () => {
    it('should search using /search/query with message entityType')
    it('should pass query string')
    it('should limit results with top parameter')
    it('should return empty results for no matches')
  })

  describe('listFolders', () => {
    it('should list all mail folders')
    it('should include well-known folders')
  })

  describe('listAttachments', () => {
    it('should list attachments for a message')
    it('should return empty array for message with no attachments')
  })

  describe('bulkMove', () => {
    it('should move multiple messages using batch API')
    it('should return count of moved messages')
    it('should handle partial failures in batch')
    it('should batch in groups of 20 (Graph API limit)')
  })

  describe('bulkMarkRead', () => {
    it('should mark multiple messages as read using batch')
    it('should return count of updated messages')
  })

  describe('bulkDelete', () => {
    it('should delete multiple messages using batch')
    it('should return count of deleted messages')
  })

  describe('listRules', () => {
    it('should list inbox message rules')
  })

  describe('createRule', () => {
    it('should create new inbox rule with conditions and actions')
  })

  describe('listCategories', () => {
    it('should list master categories')
  })

  describe('createCategory', () => {
    it('should create new category with name and color')
  })
})
```

---

## 6. Module: Calendar Operations (`src/agent/graph/calendar.ts`)

> Entirely NEW — cli-microsoft365 has zero calendar commands.

### Design

```typescript
export class CalendarOperations {
  constructor(private client: GraphClient) {}

  // --- View ---
  async listEvents(opts?: { startDate?: string; endDate?: string; top?: number; select?: string[] }): Promise<GraphResponse<Event[]>>
  async getEvent(id: string): Promise<GraphResponse<Event>>
  async getCalendarView(startDate: string, endDate: string, opts?: { top?: number }): Promise<GraphResponse<Event[]>>
  async getToday(): Promise<GraphResponse<Event[]>>
  async getThisWeek(): Promise<GraphResponse<Event[]>>
  async getUpcoming(hours?: number): Promise<GraphResponse<Event[]>>

  // --- Create/Update/Delete ---
  async createEvent(event: {
    subject: string; start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: { emailAddress: { address: string; name?: string }; type?: string }[];
    location?: { displayName: string };
    body?: { contentType: 'Text' | 'HTML'; content: string };
    isOnlineMeeting?: boolean;
    recurrence?: any;
    reminderMinutesBeforeStart?: number;
  }): Promise<GraphResponse<Event>>
  async updateEvent(id: string, updates: Partial<Event>): Promise<GraphResponse<Event>>
  async deleteEvent(id: string): Promise<GraphResponse<void>>

  // --- Respond ---
  async acceptEvent(id: string, comment?: string, sendResponse?: boolean): Promise<GraphResponse<void>>
  async declineEvent(id: string, comment?: string, sendResponse?: boolean): Promise<GraphResponse<void>>
  async tentativelyAcceptEvent(id: string, comment?: string, sendResponse?: boolean): Promise<GraphResponse<void>>

  // --- Scheduling ---
  async findMeetingTimes(params: {
    attendees: { emailAddress: { address: string } }[];
    meetingDuration: string;
    timeConstraint?: { timeslots: { start: any; end: any }[] };
  }): Promise<GraphResponse<MeetingTimeSuggestion[]>>
  async getSchedule(emails: string[], startDate: string, endDate: string): Promise<GraphResponse<ScheduleInformation[]>>
}
```

### Graph API Mapping

| Method | Endpoint | HTTP |
|---|---|---|
| listEvents | `/me/events` | GET |
| getEvent | `/me/events/{id}` | GET |
| getCalendarView | `/me/calendarView?startDateTime=X&endDateTime=Y` | GET |
| getToday | `/me/calendarView` (today 00:00 to 23:59) | GET |
| getThisWeek | `/me/calendarView` (Monday to Sunday) | GET |
| getUpcoming | `/me/calendarView` (now to now+hours) | GET |
| createEvent | `/me/events` | POST |
| updateEvent | `/me/events/{id}` | PATCH |
| deleteEvent | `/me/events/{id}` | DELETE |
| acceptEvent | `/me/events/{id}/accept` | POST |
| declineEvent | `/me/events/{id}/decline` | POST |
| tentativelyAcceptEvent | `/me/events/{id}/tentativelyAccept` | POST |
| findMeetingTimes | `/me/findMeetingTimes` | POST |
| getSchedule | `/me/calendar/getSchedule` | POST |

### TDD Test Cases (`src/agent/graph/calendar.spec.ts`)

```
describe('CalendarOperations', () => {
  describe('listEvents', () => {
    it('should list events from /me/events')
    it('should filter by date range')
    it('should pass $top parameter')
    it('should pass $select parameter')
    it('should return empty array when no events')
  })

  describe('getEvent', () => {
    it('should get single event by ID')
    it('should include attendees and location')
    it('should handle 404 with suggestion')
  })

  describe('getCalendarView', () => {
    it('should get events in date range using calendarView')
    it('should require startDateTime and endDateTime')
    it('should return recurring event instances expanded')
  })

  describe('getToday', () => {
    it('should return events for today using calendarView')
    it('should use current date start/end as boundaries')
    it('should return empty array on day with no events')
  })

  describe('getThisWeek', () => {
    it('should return events from Monday to Sunday')
    it('should calculate week boundaries correctly')
  })

  describe('getUpcoming', () => {
    it('should return events in next N hours')
    it('should default to 24 hours')
  })

  describe('createEvent', () => {
    it('should create event with subject, start, end')
    it('should create event with attendees')
    it('should create event with location')
    it('should create online meeting when isOnlineMeeting=true')
    it('should create recurring event with recurrence pattern')
    it('should handle permission error with Calendars.ReadWrite suggestion')
  })

  describe('updateEvent', () => {
    it('should update event subject')
    it('should update event time')
    it('should update event attendees')
  })

  describe('deleteEvent', () => {
    it('should delete event by ID')
    it('should return success on 204')
  })

  describe('acceptEvent', () => {
    it('should accept event invitation')
    it('should include optional comment')
    it('should send response by default')
  })

  describe('declineEvent', () => {
    it('should decline event invitation')
    it('should include optional comment')
  })

  describe('tentativelyAcceptEvent', () => {
    it('should tentatively accept event')
  })

  describe('findMeetingTimes', () => {
    it('should find available times for attendees')
    it('should respect meeting duration')
    it('should respect time constraints')
    it('should return empty suggestions when no times available')
  })

  describe('getSchedule', () => {
    it('should get free/busy schedule for users')
    it('should accept multiple email addresses')
    it('should return availability view')
  })
})
```

---

## 7. Module: Teams Operations (`src/agent/graph/teams.ts`)

### Design

```typescript
export class TeamsOperations {
  constructor(private client: GraphClient) {}

  // --- Teams & Channels ---
  async listMyTeams(opts?: { select?: string[] }): Promise<GraphResponse<Team[]>>
  async getTeam(teamId: string): Promise<GraphResponse<Team>>
  async createTeam(params: { displayName: string; description?: string; template?: string }): Promise<GraphResponse<Team>>
  async archiveTeam(teamId: string): Promise<GraphResponse<void>>
  async listChannels(teamId: string): Promise<GraphResponse<Channel[]>>
  async getChannel(teamId: string, channelId: string): Promise<GraphResponse<Channel>>
  async createChannel(teamId: string, params: { displayName: string; description?: string; membershipType?: string }): Promise<GraphResponse<Channel>>

  // --- Channel Messages ---
  async listChannelMessages(teamId: string, channelId: string, opts?: { top?: number }): Promise<GraphResponse<ChatMessage[]>>
  async sendChannelMessage(teamId: string, channelId: string, content: string, contentType?: string): Promise<GraphResponse<ChatMessage>>
  async replyToChannelMessage(teamId: string, channelId: string, messageId: string, content: string): Promise<GraphResponse<ChatMessage>>

  // --- Chats ---
  async listChats(opts?: { top?: number }): Promise<GraphResponse<Chat[]>>
  async getChat(chatId: string): Promise<GraphResponse<Chat>>
  async listChatMessages(chatId: string, opts?: { top?: number }): Promise<GraphResponse<ChatMessage[]>>
  async sendChatMessage(chatId: string, content: string): Promise<GraphResponse<ChatMessage>>

  // --- Members ---
  async listTeamMembers(teamId: string): Promise<GraphResponse<ConversationMember[]>>
  async addTeamMember(teamId: string, userId: string, role?: string): Promise<GraphResponse<ConversationMember>>
  async removeTeamMember(teamId: string, membershipId: string): Promise<GraphResponse<void>>

  // --- Meetings ---
  async listOnlineMeetings(): Promise<GraphResponse<OnlineMeeting[]>>
  async createOnlineMeeting(params: { subject: string; startDateTime: string; endDateTime: string }): Promise<GraphResponse<OnlineMeeting>>
  async getMeetingTranscript(meetingId: string, transcriptId: string): Promise<GraphResponse<string>>
  async listMeetingAttendanceReports(meetingId: string): Promise<GraphResponse<any[]>>

  // --- Presence ---
  async getMyPresence(): Promise<GraphResponse<Presence>>
  async getUserPresence(userId: string): Promise<GraphResponse<Presence>>
  async setMyPresence(availability: string, activity: string, expirationDuration?: string): Promise<GraphResponse<void>>
}
```

### TDD Test Cases (`src/agent/graph/teams.spec.ts`)

```
describe('TeamsOperations', () => {
  describe('listMyTeams', () => {
    it('should list joined teams from /me/joinedTeams')
    it('should pass $select parameter')
    it('should return empty array when user has no teams')
  })

  describe('getTeam', () => {
    it('should get team by ID')
    it('should handle 404 with suggestion')
  })

  describe('createTeam', () => {
    it('should create team with name and description')
    it('should apply template when provided')
    it('should handle permission error')
  })

  describe('archiveTeam', () => {
    it('should archive team by ID')
    it('should return success on completion')
  })

  describe('listChannels', () => {
    it('should list channels in a team')
    it('should include channel IDs and names')
  })

  describe('createChannel', () => {
    it('should create channel with name')
    it('should set membership type when provided')
  })

  describe('listChannelMessages', () => {
    it('should list messages in a channel')
    it('should pass $top parameter')
    it('should return empty array for channel with no messages')
  })

  describe('sendChannelMessage', () => {
    it('should send text message to channel')
    it('should send HTML message when contentType=html')
    it('should handle permission error with ChannelMessage.Send suggestion')
  })

  describe('replyToChannelMessage', () => {
    it('should reply to existing channel message')
  })

  describe('listChats', () => {
    it('should list user chats')
    it('should pass $top parameter')
  })

  describe('listChatMessages', () => {
    it('should list messages in a chat')
    it('should pass $top parameter')
  })

  describe('sendChatMessage', () => {
    it('should send message to chat')
    it('should handle permission error with ChatMessage.Send suggestion')
  })

  describe('listTeamMembers', () => {
    it('should list members of a team')
    it('should include roles')
  })

  describe('addTeamMember', () => {
    it('should add user as member')
    it('should set role when provided')
  })

  describe('removeTeamMember', () => {
    it('should remove member from team')
  })

  describe('createOnlineMeeting', () => {
    it('should create online meeting with subject and times')
    it('should return join URL')
  })

  describe('getMeetingTranscript', () => {
    it('should return transcript content as text')
    it('should handle missing transcript with suggestion')
  })

  describe('getMyPresence', () => {
    it('should return current user presence')
    it('should include availability and activity')
  })

  describe('getUserPresence', () => {
    it('should return specific user presence')
  })

  describe('setMyPresence', () => {
    it('should set availability and activity')
    it('should set expiration duration when provided')
  })
})
```

---

## 8. Module: Files Operations (`src/agent/graph/files.ts`)

### Design

```typescript
export class FilesOperations {
  constructor(private client: GraphClient) {}

  // --- List & Browse ---
  async listRootFiles(opts?: { driveId?: string; select?: string[] }): Promise<GraphResponse<DriveItem[]>>
  async listFolderFiles(folderId: string, opts?: { driveId?: string; select?: string[] }): Promise<GraphResponse<DriveItem[]>>
  async listSharePointDriveFiles(siteId: string, driveId: string, folderId?: string): Promise<GraphResponse<DriveItem[]>>

  // --- Get Metadata ---
  async getFileById(itemId: string, opts?: { driveId?: string }): Promise<GraphResponse<DriveItem>>
  async getFileByPath(path: string, opts?: { driveId?: string }): Promise<GraphResponse<DriveItem>>

  // --- Download ---
  async downloadFile(itemId: string, opts?: { driveId?: string }): Promise<GraphResponse<Buffer>>

  // --- Upload ---
  async uploadSmallFile(parentFolderId: string, fileName: string, content: Buffer, opts?: { driveId?: string }): Promise<GraphResponse<DriveItem>>
  async createUploadSession(parentFolderId: string, fileName: string, opts?: { driveId?: string; conflictBehavior?: string }): Promise<GraphResponse<UploadSession>>
  async uploadLargeFileChunk(uploadUrl: string, chunk: Buffer, rangeStart: number, rangeEnd: number, totalSize: number): Promise<GraphResponse<DriveItem | UploadSessionStatus>>

  // --- Folder & Delete ---
  async createFolder(parentFolderId: string, folderName: string, opts?: { driveId?: string }): Promise<GraphResponse<DriveItem>>
  async deleteItem(itemId: string, opts?: { driveId?: string }): Promise<GraphResponse<void>>

  // --- Move & Copy ---
  async moveItem(itemId: string, newParentId: string, opts?: { driveId?: string; newName?: string }): Promise<GraphResponse<DriveItem>>
  async copyItem(itemId: string, newParentId: string, opts?: { driveId?: string; newName?: string }): Promise<GraphResponse<{ monitorUrl: string }>>

  // --- Search ---
  async searchFiles(query: string, opts?: { driveId?: string; top?: number }): Promise<GraphResponse<DriveItem[]>>

  // --- Sharing ---
  async createSharingLink(itemId: string, type: 'view' | 'edit' | 'embed', scope: 'anonymous' | 'organization', opts?: { driveId?: string; expirationDateTime?: string }): Promise<GraphResponse<Permission>>

  // --- Special Views ---
  async getRecentFiles(): Promise<GraphResponse<DriveItem[]>>
  async getSharedWithMe(): Promise<GraphResponse<DriveItem[]>>

  // --- Versions ---
  async listFileVersions(itemId: string, opts?: { driveId?: string }): Promise<GraphResponse<DriveItemVersion[]>>
  async restoreFileVersion(itemId: string, versionId: string, opts?: { driveId?: string }): Promise<GraphResponse<void>>
}
```

### Graph API Mapping

| Method | Endpoint | HTTP |
|---|---|---|
| listRootFiles | `/me/drive/root/children` | GET |
| listFolderFiles | `/me/drive/items/{folderId}/children` | GET |
| listSharePointDriveFiles | `/sites/{siteId}/drives/{driveId}/items/{folderId}/children` | GET |
| getFileById | `/me/drive/items/{itemId}` | GET |
| getFileByPath | `/me/drive/root:/{path}` | GET |
| downloadFile | `/me/drive/items/{itemId}/content` | GET |
| uploadSmallFile | `/me/drive/items/{parentFolderId}:/{fileName}:/content` | PUT |
| createUploadSession | `/me/drive/items/{parentFolderId}:/{fileName}:/createUploadSession` | POST |
| uploadLargeFileChunk | `{uploadUrl}` (Range header) | PUT |
| createFolder | `/me/drive/items/{parentFolderId}/children` | POST |
| deleteItem | `/me/drive/items/{itemId}` | DELETE |
| moveItem | `/me/drive/items/{itemId}` (parentReference) | PATCH |
| copyItem | `/me/drive/items/{itemId}/copy` | POST |
| searchFiles | `/me/drive/search(q='{query}')` | GET |
| createSharingLink | `/me/drive/items/{itemId}/createLink` | POST |
| getRecentFiles | `/me/drive/recent` | GET |
| getSharedWithMe | `/me/drive/sharedWithMe` | GET |
| listFileVersions | `/me/drive/items/{itemId}/versions` | GET |
| restoreFileVersion | `/me/drive/items/{itemId}/versions/{versionId}/restoreVersion` | POST |

### TDD Test Cases (`src/agent/graph/files.spec.ts`)

```
describe('FilesOperations', () => {
  describe('listRootFiles', () => {
    it('should list files from /me/drive/root/children')
    it('should use custom driveId when provided')
    it('should pass $select parameter')
    it('should return empty array when drive is empty')
  })

  describe('listFolderFiles', () => {
    it('should list files in a specific folder by ID')
    it('should handle 404 when folder not found')
  })

  describe('listSharePointDriveFiles', () => {
    it('should list files from a SharePoint site drive')
    it('should list root when no folderId provided')
  })

  describe('getFileById', () => {
    it('should return file metadata by ID')
    it('should return 404 with suggestion when file not found')
  })

  describe('getFileByPath', () => {
    it('should return file metadata using root-relative path')
    it('should handle paths with spaces and special characters')
    it('should return 404 when path does not exist')
  })

  describe('downloadFile', () => {
    it('should return file content as Buffer')
    it('should handle permission error with Files.Read scope suggestion')
    it('should handle file not found error')
  })

  describe('uploadSmallFile', () => {
    it('should upload file under 4MB via PUT')
    it('should return created DriveItem on success')
    it('should handle conflict by replacing existing file')
  })

  describe('createUploadSession', () => {
    it('should create upload session and return uploadUrl')
    it('should accept conflictBehavior option')
  })

  describe('uploadLargeFileChunk', () => {
    it('should upload a chunk with correct Content-Range header')
    it('should return UploadSessionStatus with nextExpectedRanges for intermediate chunks')
    it('should return completed DriveItem on final chunk')
    it('should handle expired upload session error')
  })

  describe('createFolder', () => {
    it('should create folder under parent by ID')
    it('should return created DriveItem with folder facet')
    it('should handle duplicate folder name conflict')
  })

  describe('deleteItem', () => {
    it('should delete file by ID and return 204')
    it('should delete folder and all its children')
    it('should handle 404 when item not found')
  })

  describe('moveItem', () => {
    it('should move item to new parent folder')
    it('should rename item when newName is provided')
    it('should handle permission error')
  })

  describe('copyItem', () => {
    it('should initiate async copy and return monitor URL')
    it('should rename copy when newName is provided')
    it('should handle cross-drive copy')
  })

  describe('searchFiles', () => {
    it('should search files by query string across drive')
    it('should pass $top parameter')
    it('should return empty array when no results match')
    it('should search within a specific drive when driveId provided')
  })

  describe('createSharingLink', () => {
    it('should create anonymous view link')
    it('should create organization edit link')
    it('should set expirationDateTime when provided')
    it('should handle permission error with Sites.ReadWrite scope suggestion')
  })

  describe('getRecentFiles', () => {
    it('should return recently accessed files from /me/drive/recent')
    it('should return empty array when no recent files')
  })

  describe('getSharedWithMe', () => {
    it('should return files shared with current user')
    it('should include remoteItem references for cross-drive files')
  })

  describe('listFileVersions', () => {
    it('should list all versions of a file')
    it('should return version IDs and last modified times')
  })

  describe('restoreFileVersion', () => {
    it('should restore a specific version by versionId')
    it('should return 204 on success')
    it('should handle invalid versionId')
  })
})
```

---

## 9. Module: Tasks Operations (`src/agent/graph/tasks.ts`)

### Design

```typescript
export class TasksOperations {
  constructor(private client: GraphClient) {}

  // --- To Do: Task Lists ---
  async listTaskLists(): Promise<GraphResponse<TodoTaskList[]>>
  async getTaskList(listId: string): Promise<GraphResponse<TodoTaskList>>
  async createTaskList(displayName: string): Promise<GraphResponse<TodoTaskList>>

  // --- To Do: Tasks ---
  async listTasks(listId: string, opts?: { filter?: string; select?: string[] }): Promise<GraphResponse<TodoTask[]>>
  async getTask(listId: string, taskId: string): Promise<GraphResponse<TodoTask>>
  async createTask(listId: string, params: { title: string; body?: string; dueDateTime?: string; importance?: string; reminderDateTime?: string }): Promise<GraphResponse<TodoTask>>
  async updateTask(listId: string, taskId: string, updates: Partial<TodoTask>): Promise<GraphResponse<TodoTask>>
  async completeTask(listId: string, taskId: string): Promise<GraphResponse<TodoTask>>
  async deleteTask(listId: string, taskId: string): Promise<GraphResponse<void>>

  // --- Planner: Plans ---
  async listPlansForGroup(groupId: string): Promise<GraphResponse<PlannerPlan[]>>
  async getPlan(planId: string): Promise<GraphResponse<PlannerPlan>>

  // --- Planner: Buckets ---
  async listBuckets(planId: string): Promise<GraphResponse<PlannerBucket[]>>

  // --- Planner: Tasks ---
  async listTasksInPlan(planId: string): Promise<GraphResponse<PlannerTask[]>>
  async getPlannerTask(taskId: string): Promise<GraphResponse<PlannerTask>>
  async createPlannerTask(params: { planId: string; bucketId?: string; title: string; dueDateTime?: string; assignments?: Record<string, PlannerAssignment> }): Promise<GraphResponse<PlannerTask>>
  async updatePlannerTask(taskId: string, updates: Partial<PlannerTask>, etag: string): Promise<GraphResponse<PlannerTask>>
  async deletePlannerTask(taskId: string, etag: string): Promise<GraphResponse<void>>
  async assignPlannerTask(taskId: string, userId: string, etag: string): Promise<GraphResponse<PlannerTask>>
}
```

### Graph API Mapping

| Method | Endpoint | HTTP |
|---|---|---|
| listTaskLists | `/me/todo/lists` | GET |
| getTaskList | `/me/todo/lists/{listId}` | GET |
| createTaskList | `/me/todo/lists` | POST |
| listTasks | `/me/todo/lists/{listId}/tasks` | GET |
| getTask | `/me/todo/lists/{listId}/tasks/{taskId}` | GET |
| createTask | `/me/todo/lists/{listId}/tasks` | POST |
| updateTask | `/me/todo/lists/{listId}/tasks/{taskId}` | PATCH |
| completeTask | `/me/todo/lists/{listId}/tasks/{taskId}` (status=completed) | PATCH |
| deleteTask | `/me/todo/lists/{listId}/tasks/{taskId}` | DELETE |
| listPlansForGroup | `/groups/{groupId}/planner/plans` | GET |
| getPlan | `/planner/plans/{planId}` | GET |
| listBuckets | `/planner/plans/{planId}/buckets` | GET |
| listTasksInPlan | `/planner/plans/{planId}/tasks` | GET |
| getPlannerTask | `/planner/tasks/{taskId}` | GET |
| createPlannerTask | `/planner/tasks` | POST |
| updatePlannerTask | `/planner/tasks/{taskId}` (If-Match: etag) | PATCH |
| deletePlannerTask | `/planner/tasks/{taskId}` (If-Match: etag) | DELETE |
| assignPlannerTask | `/planner/tasks/{taskId}` (assignments patch, If-Match: etag) | PATCH |

### TDD Test Cases (`src/agent/graph/tasks.spec.ts`)

```
describe('TasksOperations', () => {
  describe('listTaskLists', () => {
    it('should list task lists from /me/todo/lists')
    it('should return empty array when no lists exist')
  })

  describe('getTaskList', () => {
    it('should get task list by ID')
    it('should return 404 when list not found')
  })

  describe('createTaskList', () => {
    it('should create a new task list with displayName')
    it('should return created list with ID')
  })

  describe('listTasks', () => {
    it('should list tasks in a task list')
    it('should pass $filter parameter')
    it('should pass $select parameter')
    it('should return empty array when list has no tasks')
  })

  describe('getTask', () => {
    it('should get task by listId and taskId')
    it('should return 404 with suggestion when task not found')
  })

  describe('createTask', () => {
    it('should create task with title')
    it('should set dueDateTime when provided')
    it('should set importance when provided')
    it('should set reminder when provided')
    it('should handle permission error with Tasks.ReadWrite scope suggestion')
  })

  describe('updateTask', () => {
    it('should update task title')
    it('should update multiple fields in one call')
  })

  describe('completeTask', () => {
    it('should patch task with status=completed')
    it('should set completedDateTime automatically')
  })

  describe('deleteTask', () => {
    it('should delete task and return 204')
    it('should handle 404 when task not found')
  })

  describe('listPlansForGroup', () => {
    it('should list plans for a group')
    it('should return empty array when group has no plans')
    it('should handle 404 when group not found')
  })

  describe('getPlan', () => {
    it('should get plan by ID')
    it('should return 404 when plan not found')
  })

  describe('listBuckets', () => {
    it('should list buckets for a plan')
    it('should return buckets in order')
  })

  describe('listTasksInPlan', () => {
    it('should list all tasks in a plan')
    it('should include bucket and assignment information')
  })

  describe('createPlannerTask', () => {
    it('should create task in a plan')
    it('should assign to bucket when bucketId provided')
    it('should set dueDateTime when provided')
    it('should handle permission error')
  })

  describe('updatePlannerTask', () => {
    it('should update task using If-Match etag header')
    it('should return 412 when etag is stale')
  })

  describe('deletePlannerTask', () => {
    it('should delete planner task using If-Match etag header')
    it('should return 412 when etag does not match')
  })

  describe('assignPlannerTask', () => {
    it('should add user assignment to planner task')
    it('should preserve existing assignments when adding new one')
  })
})
```

---

## 10. Module: People & Contacts Operations (`src/agent/graph/people.ts`)

### Design

```typescript
export class PeopleOperations {
  constructor(private client: GraphClient) {}

  // --- People API ---
  async listRelevantPeople(opts?: { top?: number; filter?: string; select?: string[] }): Promise<GraphResponse<Person[]>>
  async searchPeople(query: string, opts?: { top?: number }): Promise<GraphResponse<Person[]>>

  // --- Contacts ---
  async listContacts(opts?: { top?: number; filter?: string; select?: string[] }): Promise<GraphResponse<Contact[]>>
  async getContact(contactId: string): Promise<GraphResponse<Contact>>
  async createContact(params: { givenName: string; surname?: string; emailAddresses?: EmailAddress[]; businessPhones?: string[]; jobTitle?: string; companyName?: string }): Promise<GraphResponse<Contact>>
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<GraphResponse<Contact>>
  async deleteContact(contactId: string): Promise<GraphResponse<void>>

  // --- Users ---
  async getUserProfile(idOrUpn: string): Promise<GraphResponse<User>>
  async searchUsers(query: string, opts?: { top?: number; select?: string[] }): Promise<GraphResponse<User[]>>
  async getUserManager(idOrUpn: string): Promise<GraphResponse<User>>
  async getUserDirectReports(idOrUpn: string): Promise<GraphResponse<User[]>>
  async getUserPhoto(idOrUpn: string, size?: '48x48' | '64x64' | '96x96' | '120x120' | '240x240' | '360x360' | '432x432' | '504x504' | '648x648'): Promise<GraphResponse<Buffer>>
}
```

### Graph API Mapping

| Method | Endpoint | HTTP |
|---|---|---|
| listRelevantPeople | `/me/people` | GET |
| searchPeople | `/me/people?$search="{query}"` | GET |
| listContacts | `/me/contacts` | GET |
| getContact | `/me/contacts/{contactId}` | GET |
| createContact | `/me/contacts` | POST |
| updateContact | `/me/contacts/{contactId}` | PATCH |
| deleteContact | `/me/contacts/{contactId}` | DELETE |
| getUserProfile | `/users/{idOrUpn}` | GET |
| searchUsers | `/users?$filter=startsWith(displayName,'{query}')` | GET |
| getUserManager | `/users/{idOrUpn}/manager` | GET |
| getUserDirectReports | `/users/{idOrUpn}/directReports` | GET |
| getUserPhoto | `/users/{idOrUpn}/photos/{size}/$value` | GET |

### TDD Test Cases (`src/agent/graph/people.spec.ts`)

```
describe('PeopleOperations', () => {
  describe('listRelevantPeople', () => {
    it('should list relevant people from /me/people')
    it('should pass $top parameter')
    it('should pass $filter parameter')
    it('should return empty array when no relevant people')
  })

  describe('searchPeople', () => {
    it('should search people using $search query parameter')
    it('should return matching people by display name')
    it('should return empty array when no results match')
  })

  describe('listContacts', () => {
    it('should list contacts from /me/contacts')
    it('should pass $top and $filter parameters')
    it('should return empty array when contact list is empty')
  })

  describe('getContact', () => {
    it('should get contact by ID')
    it('should return 404 with suggestion when contact not found')
  })

  describe('createContact', () => {
    it('should create contact with givenName')
    it('should include email addresses when provided')
    it('should include phone numbers when provided')
    it('should include job title and company when provided')
  })

  describe('updateContact', () => {
    it('should update contact fields via PATCH')
    it('should return updated contact')
  })

  describe('deleteContact', () => {
    it('should delete contact and return 204')
    it('should handle 404 when contact not found')
  })

  describe('getUserProfile', () => {
    it('should get user profile by object ID')
    it('should get user profile by UPN')
    it('should return 404 when user not found')
    it('should handle guest user profiles')
  })

  describe('searchUsers', () => {
    it('should filter users using $filter with startsWith on displayName')
    it('should also search by mail and userPrincipalName')
    it('should pass $select parameter')
    it('should return empty array when no users match')
  })

  describe('getUserManager', () => {
    it('should return manager of a user')
    it('should handle 404 when user has no manager')
  })

  describe('getUserDirectReports', () => {
    it('should return direct reports of a user')
    it('should return empty array when user has no direct reports')
  })

  describe('getUserPhoto', () => {
    it('should return user photo as Buffer')
    it('should use default size when none specified')
    it('should request specific size when provided')
    it('should handle 404 when user has no photo')
    it('should handle permission error')
  })
})
```

---

## 11. Module: Search Operations (`src/agent/graph/search.ts`)

### Design

```typescript
export class SearchOperations {
  constructor(private client: GraphClient) {}

  // --- Unified Search ---
  async searchAll(query: string, opts?: { top?: number; from?: number; select?: string[] }): Promise<GraphResponse<SearchResponse>>
  async searchEntityTypes(query: string, entityTypes: SearchEntityType[], opts?: { top?: number; from?: number }): Promise<GraphResponse<SearchResponse>>
  async searchWithFilters(query: string, entityTypes: SearchEntityType[], filters: SearchFilters, opts?: { top?: number }): Promise<GraphResponse<SearchResponse>>
  async getSearchSuggestions(query: string, opts?: { entityTypes?: SearchEntityType[] }): Promise<GraphResponse<SearchSuggestion[]>>
}

// Supporting types
type SearchEntityType =
  | 'message'
  | 'event'
  | 'drive'
  | 'driveItem'
  | 'site'
  | 'list'
  | 'listItem'
  | 'chatMessage'
  | 'person'

interface SearchFilters {
  dateRange?: { from: string; to: string }
  from?: string
  contentSource?: string
}
```

### Graph API Mapping

| Method | Endpoint | HTTP |
|---|---|---|
| searchAll | `/search/query` (all entity types) | POST |
| searchEntityTypes | `/search/query` (specified entityTypes) | POST |
| searchWithFilters | `/search/query` (with query string filters via KQL) | POST |
| getSearchSuggestions | `/search/query` (queryAlterationOptions) | POST |

### TDD Test Cases (`src/agent/graph/search.spec.ts`)

```
describe('SearchOperations', () => {
  describe('searchAll', () => {
    it('should search across all supported entity types')
    it('should pass query string to /search/query')
    it('should pass $top and from for pagination')
    it('should return hits grouped by entity type')
    it('should return empty hits array when no results found')
  })

  describe('searchEntityTypes', () => {
    it('should search only message entities')
    it('should search only driveItem entities')
    it('should search multiple entity types in one request')
    it('should handle unsupported entity type combination gracefully')
  })

  describe('searchWithFilters', () => {
    it('should apply date range filter using KQL received:>= and received:<=')
    it('should apply from filter using KQL from: operator')
    it('should combine query string with filters')
    it('should handle empty results when filters exclude all matches')
  })

  describe('getSearchSuggestions', () => {
    it('should return query alteration suggestions for misspelled query')
    it('should return empty suggestions when query is already optimal')
    it('should filter suggestions by entity type when provided')
  })
})
```

---

## 12. CLI Commands (`src/m365/agent/`)

Three CLI commands expose the agent layer for terminal and script use.

### 12.1 `m365 agent execute` (`src/m365/agent/commands/agent-execute.ts`)

Executes any agent operation by module + operation name.

```typescript
import { GraphCommand } from '../../base/GraphCommand.js';
import { z } from 'zod';
import { globalOptionsZod } from '../../Command.js';

const options = globalOptionsZod.extend({
  module: z.enum(['mail', 'calendar', 'teams', 'files', 'tasks', 'people', 'search']),
  operation: z.string(),
  params: z.string().optional(),       // JSON string of operation parameters
  maxTokens: z.number().default(4000), // response truncation limit
});

class AgentExecuteCommand extends GraphCommand {
  public get name(): string { return 'agent execute'; }
  public get description(): string { return 'Executes an agent operation against Microsoft 365'; }
  public get schema() { return options; }

  public async commandAction(logger: Logger, args: { options: z.infer<typeof options> }): Promise<void> {
    // 1. Resolve module → Operations class (MailOperations, CalendarOperations, etc.)
    // 2. Resolve operation → method on the Operations class
    // 3. Parse --params JSON string into method arguments
    // 4. Create GraphClient using auth from this.connection
    // 5. Call method, format result with Formatter (maxTokens, field selection)
    // 6. Output JSON result via logger.log()
  }
}
```

**Usage examples:**
```bash
m365 agent execute --module mail --operation listInbox --params '{"top":5}'
m365 agent execute --module calendar --operation getToday
m365 agent execute --module teams --operation sendChannelMessage \
  --params '{"teamId":"abc","channelId":"def","content":"Hello from agent"}'
m365 agent execute --module files --operation searchFiles --params '{"query":"quarterly report"}'
m365 agent execute --module tasks --operation createTodoTask \
  --params '{"listId":"abc","title":"Review PR","dueDateTime":"2026-04-05"}'
```

### 12.2 `m365 agent search` (`src/m365/agent/commands/agent-search.ts`)

Discovers available operations across modules.

```typescript
const options = globalOptionsZod.extend({
  query: z.string().optional(),
  module: z.enum(['mail', 'calendar', 'teams', 'files', 'tasks', 'people', 'search']).optional(),
});

class AgentSearchCommand extends GraphCommand {
  public get name(): string { return 'agent search'; }
  public get description(): string { return 'Searches available agent operations'; }
  public get schema() { return options; }

  public async commandAction(logger: Logger, args: { options: z.infer<typeof options> }): Promise<void> {
    // 1. Build operation catalog from all Operations classes
    // 2. If --module provided, filter to that module only
    // 3. If --query provided, fuzzy match on operation name + description
    // 4. Return array of { module, operation, description, parameters }
  }
}
```

**Usage examples:**
```bash
m365 agent search --query "send email"
# → [{ module: "mail", operation: "sendMail", description: "Send an email", parameters: "to, subject, body, ..." }]

m365 agent search --module teams
# → lists all teams operations with descriptions

m365 agent search
# → lists ALL operations across all modules (compact format)
```

### 12.3 `m365 agent status` (`src/m365/agent/commands/agent-status.ts`)

Shows agent layer status and auth info.

```typescript
class AgentStatusCommand extends GraphCommand {
  public get name(): string { return 'agent status'; }
  public get description(): string { return 'Shows agent status and available modules'; }

  public async commandAction(logger: Logger): Promise<void> {
    // 1. Check auth connection status
    // 2. List available modules with operation counts
    // 3. Show Graph API endpoint being used
    // 4. Show token cache status
  }
}
```

**Output format:**
```json
{
  "authenticated": true,
  "identity": "user@contoso.com",
  "cloudType": "Public",
  "modules": {
    "mail": { "operations": 28, "status": "ready" },
    "calendar": { "operations": 14, "status": "ready" },
    "teams": { "operations": 22, "status": "ready" },
    "files": { "operations": 14, "status": "ready" },
    "tasks": { "operations": 18, "status": "ready" },
    "people": { "operations": 12, "status": "ready" },
    "search": { "operations": 4, "status": "ready" }
  },
  "graphEndpoint": "https://graph.microsoft.com/v1.0"
}
```

### 12.4 Command Registration (`src/m365/agent/commands.ts`)

```typescript
const prefix = 'agent';

export default {
  EXECUTE: `${prefix} execute`,
  SEARCH: `${prefix} search`,
  STATUS: `${prefix} status`,
};
```

### TDD Test Cases (`src/m365/agent/commands/`)

```
describe('agent execute', () => {
  it('should execute mail listInbox operation')
  it('should execute calendar getToday operation')
  it('should execute teams sendChannelMessage operation')
  it('should parse --params JSON string into method arguments')
  it('should return error for unknown module')
  it('should return error for unknown operation')
  it('should return error for invalid --params JSON')
  it('should apply --maxTokens truncation to response')
  it('should require authentication')
  it('should handle Graph API errors with actionable suggestions')
})

describe('agent search', () => {
  it('should return all operations when no query or module given')
  it('should filter operations by module')
  it('should fuzzy match operations by query')
  it('should return empty array for no matches')
  it('should include operation descriptions and parameter info')
})

describe('agent status', () => {
  it('should show authenticated status when logged in')
  it('should show unauthenticated status when not logged in')
  it('should list all modules with operation counts')
  it('should show graph endpoint')
})
```

---

## 13. Claude Skills Pack (`skills/`)

### 13.1 Meta-Skill: m365-agent (`skills/m365-agent/SKILL.md`)

```yaml
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

| Module | Key Operations | When to Use |
|--------|---------------|-------------|
| mail | listInbox, sendMail, searchMail, moveMessage | Email triage, sending, organizing |
| calendar | getToday, createEvent, findMeetingTimes | Scheduling, calendar management |
| teams | sendChannelMessage, listChats, listMyTeams | Team communication, collaboration |
| files | listFiles, uploadFile, searchFiles | Document management, file sharing |
| tasks | createTodoTask, createPlannerTask, listTasks | Task tracking, project management |
| people | searchPeople, getUserProfile, listContacts | Finding people, contact management |
| search | searchAll, searchByEntityType | Cross-domain content discovery |

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

## Module Routing

- **"Check my email"** → mail.listInbox
- **"Send an email to..."** → mail.sendMail
- **"What meetings do I have today?"** → calendar.getToday
- **"Schedule a meeting with..."** → calendar.createEvent + calendar.findMeetingTimes
- **"Post in the #general channel"** → teams.sendChannelMessage
- **"Find the quarterly report"** → search.searchAll or files.searchFiles
- **"Create a task to..."** → tasks.createTodoTask
- **"Who is the manager of..."** → people.getUserManager
```

### 13.2 Domain Sub-Skills

Each domain skill is a focused SKILL.md that provides detailed guidance for a specific module.

**`skills/m365-mail/SKILL.md`**
```yaml
---
name: m365-mail
description: >
  Manages Microsoft 365 email. Read, send, search, and organize Outlook emails.
  Use when user mentions 'email', 'mail', 'inbox', 'send message', 'outlook',
  or asks to check/manage their messages.
---
```
Key workflows: inbox triage (list → scan → mark read/flag/move), send with attachments, search by sender/subject/date, bulk operations, rule management.

**`skills/m365-calendar/SKILL.md`**
```yaml
---
name: m365-calendar
description: >
  Manages Microsoft 365 calendar. View, create, and manage events and meetings.
  Use when user mentions 'calendar', 'meeting', 'schedule', 'appointment',
  'free time', 'availability', or asks about their day/week.
---
```
Key workflows: daily briefing (getToday), schedule meeting (findMeetingTimes → createEvent), respond to invitations, reschedule.

**`skills/m365-teams/SKILL.md`**
```yaml
---
name: m365-teams
description: >
  Manages Microsoft Teams communication. Send messages, manage channels, and
  handle meetings. Use when user mentions 'teams', 'channel', 'chat',
  'team message', 'meeting', or asks about team communication.
---
```
Key workflows: post to channel, read chat history, manage team membership, create meetings with join URLs.

**`skills/m365-files/SKILL.md`**
```yaml
---
name: m365-files
description: >
  Manages files on OneDrive and SharePoint. Upload, download, search, and share files.
  Use when user mentions 'file', 'document', 'onedrive', 'sharepoint', 'upload',
  'download', 'share', or asks about documents.
---
```
Key workflows: find files (search → list), upload documents, create sharing links, manage versions.

**`skills/m365-tasks/SKILL.md`**
```yaml
---
name: m365-tasks
description: >
  Manages tasks in Microsoft To Do and Planner. Create, update, and track tasks.
  Use when user mentions 'task', 'todo', 'planner', 'plan', 'bucket',
  'assignment', or asks about task tracking.
---
```
Key workflows: create tasks with due dates, assign planner tasks, track completion, manage task lists and buckets.

### 13.3 Skills File Structure

```
skills/
├── m365-agent/
│   ├── SKILL.md                    # Meta router skill (full content above)
│   └── references/
│       └── api-reference.md        # Complete operation catalog with parameters
├── m365-mail/
│   └── SKILL.md                    # Mail-focused workflows and examples
├── m365-calendar/
│   └── SKILL.md                    # Calendar-focused workflows and examples
├── m365-teams/
│   └── SKILL.md                    # Teams-focused workflows and examples
├── m365-files/
│   └── SKILL.md                    # Files-focused workflows and examples
└── m365-tasks/
    └── SKILL.md                    # Tasks-focused workflows and examples
```

---

## 14. Implementation Phases (TDD)

### TDD Workflow

For every module:
1. **Write test** → describe expected behavior
2. **Run test (RED)** → verify it fails
3. **Implement** → minimum code to pass
4. **Run test (GREEN)** → verify it passes
5. **Refactor** → clean up, no behavior change

### Phase 1: Foundation (GraphClient + Formatter + Types)

| File | Type | Est. Tests |
|------|------|-----------|
| `src/agent/types.ts` | Types/interfaces | 0 |
| `src/agent/graph-client.spec.ts` | Test | 35 |
| `src/agent/graph-client.ts` | Implementation | — |
| `src/agent/formatter.spec.ts` | Test | 25 |
| `src/agent/formatter.ts` | Implementation | — |
| `src/agent/index.ts` | Exports | 0 |

**Dependencies:** `src/Auth.ts`, `src/request.ts` (existing, reused as-is)
**Total test cases:** 60

### Phase 2: Core Domains (Mail + Calendar + Search)

| File | Type | Est. Tests |
|------|------|-----------|
| `src/agent/graph/mail.spec.ts` | Test | 40 |
| `src/agent/graph/mail.ts` | Implementation | — |
| `src/agent/graph/calendar.spec.ts` | Test | 30 |
| `src/agent/graph/calendar.ts` | Implementation | — |
| `src/agent/graph/search.spec.ts` | Test | 10 |
| `src/agent/graph/search.ts` | Implementation | — |

**Dependencies:** Phase 1 (GraphClient, Formatter)
**Total test cases:** 80

### Phase 3: Collaboration (Teams + Files)

| File | Type | Est. Tests |
|------|------|-----------|
| `src/agent/graph/teams.spec.ts` | Test | 30 |
| `src/agent/graph/teams.ts` | Implementation | — |
| `src/agent/graph/files.spec.ts` | Test | 25 |
| `src/agent/graph/files.ts` | Implementation | — |

**Dependencies:** Phase 1
**Total test cases:** 55

### Phase 4: Productivity (Tasks + People/Contacts)

| File | Type | Est. Tests |
|------|------|-----------|
| `src/agent/graph/tasks.spec.ts` | Test | 20 |
| `src/agent/graph/tasks.ts` | Implementation | — |
| `src/agent/graph/people.spec.ts` | Test | 15 |
| `src/agent/graph/people.ts` | Implementation | — |

**Dependencies:** Phase 1
**Total test cases:** 35

### Phase 5: CLI Commands

| File | Type | Est. Tests |
|------|------|-----------|
| `src/m365/agent/commands.ts` | Constants | 0 |
| `src/m365/agent/commands/agent-execute.spec.ts` | Test | 10 |
| `src/m365/agent/commands/agent-execute.ts` | Implementation | — |
| `src/m365/agent/commands/agent-search.spec.ts` | Test | 5 |
| `src/m365/agent/commands/agent-search.ts` | Implementation | — |
| `src/m365/agent/commands/agent-status.spec.ts` | Test | 4 |
| `src/m365/agent/commands/agent-status.ts` | Implementation | — |

**Dependencies:** Phases 1–4
**Total test cases:** 19

### Phase 6: Skills Pack

| File | Type |
|------|------|
| `skills/m365-agent/SKILL.md` | Meta skill |
| `skills/m365-agent/references/api-reference.md` | API catalog |
| `skills/m365-mail/SKILL.md` | Mail skill |
| `skills/m365-calendar/SKILL.md` | Calendar skill |
| `skills/m365-teams/SKILL.md` | Teams skill |
| `skills/m365-files/SKILL.md` | Files skill |
| `skills/m365-tasks/SKILL.md` | Tasks skill |

**Dependencies:** Phases 1–5
**Testing:** Manual trigger accuracy testing (target: 90%+ trigger accuracy)

### Phase Dependency Diagram

```
Phase 1: Foundation ──────────────────────────────┐
    │                                              │
    ├──► Phase 2: Mail + Calendar + Search         │
    │                                              │
    ├──► Phase 3: Teams + Files                    │
    │                                              │
    ├──► Phase 4: Tasks + People                   │
    │                                              │
    └──► (Phases 2-4 can run in parallel) ─────────┤
                                                   │
                                          Phase 5: CLI Commands
                                                   │
                                          Phase 6: Skills Pack
```

### Grand Total: ~249 test cases across 6 phases

---

## 15. Complete File Structure

```
src/agent/
├── types.ts                          # Shared types: GraphResponse, AgentError, etc.
├── graph-client.ts                   # GraphClient wrapping Auth.ts + request.ts
├── graph-client.spec.ts              # 35 tests
├── formatter.ts                      # Token-aware response formatter
├── formatter.spec.ts                 # 25 tests
├── index.ts                          # Public API exports
└── graph/
    ├── mail.ts                       # MailOperations (28 methods)
    ├── mail.spec.ts                  # 40 tests
    ├── calendar.ts                   # CalendarOperations (14 methods)
    ├── calendar.spec.ts              # 30 tests
    ├── teams.ts                      # TeamsOperations (22 methods)
    ├── teams.spec.ts                 # 30 tests
    ├── files.ts                      # FilesOperations (14 methods)
    ├── files.spec.ts                 # 25 tests
    ├── tasks.ts                      # TasksOperations (18 methods)
    ├── tasks.spec.ts                 # 20 tests
    ├── people.ts                     # PeopleOperations (12 methods)
    ├── people.spec.ts                # 15 tests
    ├── search.ts                     # SearchOperations (4 methods)
    └── search.spec.ts                # 10 tests

src/m365/agent/
├── commands.ts                       # Command name constants
└── commands/
    ├── agent-execute.ts              # m365 agent execute
    ├── agent-execute.spec.ts         # 10 tests
    ├── agent-search.ts               # m365 agent search
    ├── agent-search.spec.ts          # 5 tests
    ├── agent-status.ts               # m365 agent status
    └── agent-status.spec.ts          # 4 tests

skills/
├── m365-agent/
│   ├── SKILL.md                      # Meta router skill
│   └── references/
│       └── api-reference.md          # Complete operation reference
├── m365-mail/
│   └── SKILL.md                      # Mail workflows
├── m365-calendar/
│   └── SKILL.md                      # Calendar workflows
├── m365-teams/
│   └── SKILL.md                      # Teams workflows
├── m365-files/
│   └── SKILL.md                      # Files workflows
└── m365-tasks/
    └── SKILL.md                      # Tasks workflows
```

**Total new files: 30** (16 source + 10 test + 7 skill/reference docs + 1 command constants)
**Total test cases: ~249**
**Reused existing files: 2** (`src/Auth.ts`, `src/request.ts`)
