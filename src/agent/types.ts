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

// --- Microsoft Graph Entity Types ---

export interface EmailAddress {
  address: string;
  name?: string;
}

export interface Recipient {
  emailAddress: EmailAddress;
}

export interface ItemBody {
  contentType: 'Text' | 'HTML';
  content: string;
}

export interface Message {
  id: string;
  subject: string;
  bodyPreview?: string;
  body?: ItemBody;
  from?: Recipient;
  toRecipients?: Recipient[];
  ccRecipients?: Recipient[];
  bccRecipients?: Recipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  isDraft?: boolean;
  importance?: 'low' | 'normal' | 'high';
  flag?: { flagStatus: 'notFlagged' | 'flagged' | 'complete' };
  categories?: string[];
  hasAttachments?: boolean;
  internetMessageId?: string;
  conversationId?: string;
  parentFolderId?: string;
}

export interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount?: number;
  unreadItemCount?: number;
  totalItemCount?: number;
}

export interface Attachment {
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  contentBytes?: string;
}

export interface MessageRule {
  id: string;
  displayName: string;
  sequence?: number;
  isEnabled?: boolean;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

export interface OutlookCategory {
  id?: string;
  displayName: string;
  color?: string;
}

export interface DateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface Event {
  id: string;
  subject: string;
  body?: ItemBody;
  start: DateTimeTimeZone;
  end: DateTimeTimeZone;
  location?: { displayName: string };
  attendees?: EventAttendee[];
  organizer?: Recipient;
  isOnlineMeeting?: boolean;
  onlineMeeting?: { joinUrl?: string };
  recurrence?: Record<string, unknown>;
  reminderMinutesBeforeStart?: number;
  responseStatus?: { response: string; time?: string };
  isCancelled?: boolean;
  isAllDay?: boolean;
}

export interface EventAttendee {
  emailAddress: EmailAddress;
  type?: 'required' | 'optional' | 'resource';
  status?: { response: string; time?: string };
}

export interface MeetingTimeSuggestion {
  meetingTimeSlot: { start: DateTimeTimeZone; end: DateTimeTimeZone };
  confidence: number;
  attendeeAvailability?: unknown[];
}

export interface ScheduleInformation {
  scheduleId: string;
  availabilityView: string;
  scheduleItems?: unknown[];
}

export interface Team {
  id: string;
  displayName: string;
  description?: string;
  isArchived?: boolean;
}

export interface Channel {
  id: string;
  displayName: string;
  description?: string;
  membershipType?: 'standard' | 'private' | 'shared';
}

export interface ChatMessage {
  id: string;
  body: ItemBody;
  from?: { user?: { displayName?: string; id?: string } };
  createdDateTime?: string;
  messageType?: string;
}

export interface Chat {
  id: string;
  topic?: string;
  chatType?: 'oneOnOne' | 'group' | 'meeting';
  lastUpdatedDateTime?: string;
}

export interface ConversationMember {
  id: string;
  displayName?: string;
  roles?: string[];
  userId?: string;
}

export interface OnlineMeeting {
  id: string;
  subject?: string;
  startDateTime?: string;
  endDateTime?: string;
  joinWebUrl?: string;
  videoTeleconferenceId?: string;
}

export interface Presence {
  id?: string;
  availability: string;
  activity: string;
}

export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  file?: { mimeType?: string; hashes?: Record<string, string> };
  folder?: { childCount?: number };
  parentReference?: { driveId?: string; id?: string; path?: string };
  remoteItem?: Record<string, unknown>;
}

export interface UploadSession {
  uploadUrl: string;
  expirationDateTime?: string;
  nextExpectedRanges?: string[];
}

export interface DriveItemVersion {
  id: string;
  lastModifiedDateTime?: string;
  lastModifiedBy?: { user?: { displayName?: string } };
  size?: number;
}

export interface Permission {
  id: string;
  link?: { type: string; scope: string; webUrl?: string };
  expirationDateTime?: string;
}

export interface TodoTaskList {
  id: string;
  displayName: string;
  isOwner?: boolean;
  isShared?: boolean;
}

export interface TodoTask {
  id: string;
  title: string;
  body?: ItemBody;
  status?: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  importance?: 'low' | 'normal' | 'high';
  dueDateTime?: DateTimeTimeZone;
  completedDateTime?: DateTimeTimeZone;
  reminderDateTime?: DateTimeTimeZone;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface PlannerPlan {
  id: string;
  title: string;
  owner?: string;
  createdDateTime?: string;
}

export interface PlannerBucket {
  id: string;
  name: string;
  planId?: string;
  orderHint?: string;
}

export interface PlannerTask {
  id: string;
  title: string;
  planId?: string;
  bucketId?: string;
  assignments?: Record<string, { assignedBy?: unknown; assignedDateTime?: string; orderHint?: string }>;
  percentComplete?: number;
  dueDateTime?: string;
  startDateTime?: string;
  priority?: number;
  '@odata.etag'?: string;
}

export interface Person {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  emailAddresses?: EmailAddress[];
  phones?: { type?: string; number?: string }[];
  department?: string;
  jobTitle?: string;
  userPrincipalName?: string;
}

export interface Contact {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  emailAddresses?: EmailAddress[];
  businessPhones?: string[];
  mobilePhone?: string;
  companyName?: string;
  jobTitle?: string;
  department?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
}
