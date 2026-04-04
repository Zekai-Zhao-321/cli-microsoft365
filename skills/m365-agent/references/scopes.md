# Required Permission Scopes

## Scope Matrix by Module

| Module | Read Scopes | Write Scopes |
|--------|------------|-------------|
| mail | Mail.Read | Mail.ReadWrite, Mail.Send |
| calendar | Calendars.Read | Calendars.ReadWrite |
| teams | Team.ReadBasic.All, ChannelMessage.Read.All | ChannelMessage.Send, ChatMessage.Send |
| files | Files.Read, Files.Read.All | Files.ReadWrite, Files.ReadWrite.All, Sites.ReadWrite.All |
| tasks | Tasks.Read | Tasks.ReadWrite |
| people | People.Read, User.Read.All | Contacts.ReadWrite |
| search | Same as the entity types being searched | N/A |

## Common Operations and Their Scopes

| Operation | Minimum Scope |
|-----------|--------------|
| mail.listInbox | Mail.Read |
| mail.sendMail | Mail.Send |
| mail.moveMessage | Mail.ReadWrite |
| calendar.getToday | Calendars.Read |
| calendar.createEvent | Calendars.ReadWrite |
| calendar.findMeetingTimes | Calendars.Read |
| teams.listMyTeams | Team.ReadBasic.All |
| teams.sendChannelMessage | ChannelMessage.Send |
| teams.sendChatMessage | ChatMessage.Send |
| files.listRootFiles | Files.Read |
| files.uploadSmallFile | Files.ReadWrite |
| files.createSharingLink | Files.ReadWrite |
| tasks.listTasks | Tasks.Read |
| tasks.createTask | Tasks.ReadWrite |
| people.searchPeople | People.Read |
| people.listContacts | Contacts.Read |
| search.searchAll | Scopes for each entity type searched |

## Re-authenticating with Scopes

If you get `Authorization_RequestDenied`, re-authenticate:
```bash
m365 login
```

The CLI will request the needed scopes during the auth flow.
