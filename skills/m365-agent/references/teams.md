# M365 Teams

Full Teams management via the `teams` module of the M365 agent layer.

## Operations Overview (21 total)

| Category              | Operations                                                                       |
|-----------------------|----------------------------------------------------------------------------------|
| Teams & Channels      | listMyTeams, getTeam, createTeam, archiveTeam, listChannels, getChannel, createChannel |
| Channel Messages      | listChannelMessages, sendChannelMessage, replyToChannelMessage                   |
| Chats                 | listChats, getChat, listChatMessages, sendChatMessage                            |
| Members               | listTeamMembers, addTeamMember, removeTeamMember                                 |
| Online Meetings       | listOnlineMeetings, createOnlineMeeting, getMeetingTranscript, listMeetingAttendanceReports |
| Presence              | getMyPresence, getUserPresence, setMyPresence                                    |

## Workflow: Post a Message to a Channel

### Step 1 — Find the team

```bash
m365 agent execute --module teams --operation listMyTeams
```

### Step 2 — List channels in the team

```bash
m365 agent execute --module teams --operation listChannels \
  --params '{"teamId":"<teamId>"}'
```

### Step 3 — Post the message

```bash
# Plain text
m365 agent execute --module teams --operation sendChannelMessage \
  --params '{
    "teamId": "<teamId>",
    "channelId": "<channelId>",
    "content": "Sprint review is at 3pm today in Room A."
  }'

# HTML-formatted message
m365 agent execute --module teams --operation sendChannelMessage \
  --params '{
    "teamId": "<teamId>",
    "channelId": "<channelId>",
    "content": "<b>Reminder:</b> All PRs must be reviewed by EOD.",
    "contentType": "html"
  }'
```

### Step 4 — Reply to a message thread

```bash
m365 agent execute --module teams --operation replyToChannelMessage \
  --params '{
    "teamId": "<teamId>",
    "channelId": "<channelId>",
    "messageId": "<messageId>",
    "content": "Done! Merged."
  }'
```

## Workflow: Read Chat History

```bash
# List all chats
m365 agent execute --module teams --operation listChats

# Get messages from a specific chat
m365 agent execute --module teams --operation listChatMessages \
  --params '{"chatId":"<chatId>"}'

# Send a chat message
m365 agent execute --module teams --operation sendChatMessage \
  --params '{"chatId":"<chatId>","content":"Hi! Are you available for a quick call?"}'
```

## Workflow: Create a Teams Online Meeting

```bash
m365 agent execute --module teams --operation createOnlineMeeting \
  --params '{
    "subject": "Design Review",
    "startDateTime": "2026-04-10T14:00:00Z",
    "endDateTime":   "2026-04-10T15:00:00Z"
  }'
```

The response includes `joinWebUrl` — share this URL with participants.

## Workflow: Manage Team Membership

```bash
# List members
m365 agent execute --module teams --operation listTeamMembers \
  --params '{"teamId":"<teamId>"}'

# Add a member
m365 agent execute --module teams --operation addTeamMember \
  --params '{"teamId":"<teamId>","userId":"<userId>"}'

# Add as owner
m365 agent execute --module teams --operation addTeamMember \
  --params '{"teamId":"<teamId>","userId":"<userId>","role":"owner"}'

# Remove a member (use the membership ID from listTeamMembers, not the user ID)
m365 agent execute --module teams --operation removeTeamMember \
  --params '{"teamId":"<teamId>","membershipId":"<membershipId>"}'
```

## Workflow: Presence

```bash
# Get own presence
m365 agent execute --module teams --operation getMyPresence

# Get another user's presence
m365 agent execute --module teams --operation getUserPresence \
  --params '{"userId":"<userId>"}'

# Set own presence (valid availability: Available, Busy, DoNotDisturb, BeRightBack, Away, Offline)
m365 agent execute --module teams --operation setMyPresence \
  --params '{
    "availability": "DoNotDisturb",
    "activity": "Focusing",
    "expirationDuration": "PT2H"
  }'
```

## Workflow: Meeting Transcripts & Attendance

```bash
# List attendance reports for a meeting
m365 agent execute --module teams --operation listMeetingAttendanceReports \
  --params '{"meetingId":"<meetingId>"}'

# Get transcript content
m365 agent execute --module teams --operation getMeetingTranscript \
  --params '{"meetingId":"<meetingId>","transcriptId":"<transcriptId>"}'
```

## Operation Routing

| User intent                            | Operation                              |
|----------------------------------------|----------------------------------------|
| "Post to #general"                     | listMyTeams → listChannels → sendChannelMessage |
| "Read my chats"                        | listChats → listChatMessages           |
| "Message Alice on Teams"               | listChats (find 1:1) → sendChatMessage |
| "Create a Teams meeting link"          | createOnlineMeeting                    |
| "Who is in the DevOps team?"           | listTeamMembers                        |
| "Add Bob to the team"                  | addTeamMember                          |
| "What is Alice's status?"              | getUserPresence                        |
| "Set me as do not disturb"             | setMyPresence                          |
| "Show meeting attendance"              | listMeetingAttendanceReports           |
| "Get the transcript from Monday's call"| getMeetingTranscript                   |

## Error Handling

| Situation                       | Likely cause                          | Fix                                              |
|---------------------------------|---------------------------------------|--------------------------------------------------|
| `Authorization_RequestDenied`   | Missing `ChannelMessage.Send` etc.    | Re-authenticate with Teams scopes               |
| `Request_ResourceNotFound`      | Stale team/channel/chat ID            | Re-list to get current IDs                      |
| `Forbidden` on presence         | Tenant policy restricts presence      | Check admin policy; some tenants block this      |
| 404 on transcript               | Meeting has no transcript enabled     | Transcription must be started during the meeting |
| `BadRequest` on sendChannelMessage | `contentType` must be `text` or `html` | Check the contentType value                   |
