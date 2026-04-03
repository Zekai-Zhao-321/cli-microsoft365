# M365 Calendar

Full calendar management via the `calendar` module of the M365 agent layer.

## Operations Overview (14 total)

| Category         | Operations                                                                |
|------------------|---------------------------------------------------------------------------|
| View events      | getToday, getThisWeek, getUpcoming, listEvents, getEvent, getCalendarView |
| Create & Update  | createEvent, updateEvent, deleteEvent                                     |
| RSVP             | acceptEvent, declineEvent, tentativelyAcceptEvent                         |
| Scheduling       | findMeetingTimes, getSchedule                                             |

## Workflow: Daily Briefing

Get everything on the calendar for today:

```bash
m365 agent execute --module calendar --operation getToday
```

Get events for this week:

```bash
m365 agent execute --module calendar --operation getThisWeek
```

Get events in the next 48 hours:

```bash
m365 agent execute --module calendar --operation getUpcoming \
  --params '{"hours":48}'
```

## Workflow: Schedule a Meeting

### Step 1 — Find available times

```bash
m365 agent execute --module calendar --operation findMeetingTimes \
  --params '{
    "attendees": [
      {"emailAddress":{"address":"alice@contoso.com"},"type":"required"},
      {"emailAddress":{"address":"bob@contoso.com"},"type":"optional"}
    ],
    "timeConstraint": {
      "timeslots": [{
        "start": {"dateTime":"2026-04-07T08:00:00","timeZone":"UTC"},
        "end":   {"dateTime":"2026-04-07T18:00:00","timeZone":"UTC"}
      }]
    },
    "meetingDuration": "PT1H"
  }'
```

### Step 2 — Create the event

```bash
m365 agent execute --module calendar --operation createEvent \
  --params '{
    "subject": "Project Kickoff",
    "start": {"dateTime":"2026-04-07T10:00:00","timeZone":"UTC"},
    "end":   {"dateTime":"2026-04-07T11:00:00","timeZone":"UTC"},
    "attendees": [
      {"emailAddress":{"address":"alice@contoso.com"},"type":"required"}
    ],
    "isOnlineMeeting": true,
    "onlineMeetingProvider": "teamsForBusiness",
    "body": {"contentType":"HTML","content":"<p>Agenda: intro, goals, next steps.</p>"}
  }'
```

## Workflow: View a Date Range

```bash
m365 agent execute --module calendar --operation listEvents \
  --params '{
    "startDate": "2026-04-01T00:00:00",
    "endDate":   "2026-04-30T23:59:59",
    "top": 50,
    "select": ["id","subject","start","end","organizer","isOnlineMeeting"]
  }'
```

For a strict calendar view (includes recurring instances):

```bash
m365 agent execute --module calendar --operation getCalendarView \
  --params '{
    "startDateTime": "2026-04-01T00:00:00Z",
    "endDateTime":   "2026-04-07T23:59:59Z"
  }'
```

## Workflow: RSVP to Invitations

```bash
# Accept
m365 agent execute --module calendar --operation acceptEvent \
  --params '{"id":"<eventId>","comment":"Looking forward to it!","sendResponse":true}'

# Decline
m365 agent execute --module calendar --operation declineEvent \
  --params '{"id":"<eventId>","comment":"Conflicting commitment.","sendResponse":true}'

# Tentative
m365 agent execute --module calendar --operation tentativelyAcceptEvent \
  --params '{"id":"<eventId>","comment":"Will confirm by Wednesday.","sendResponse":true}'
```

## Workflow: Check Attendee Availability

```bash
m365 agent execute --module calendar --operation getSchedule \
  --params '{
    "emails": ["alice@contoso.com","bob@contoso.com"],
    "startDate": "2026-04-07T08:00:00",
    "endDate":   "2026-04-07T18:00:00",
    "availabilityViewInterval": 30
  }'
```

The response contains a free/busy grid for each attendee in `availabilityView` (0=free, 1=tentative, 2=busy, 3=OOF, 4=working elsewhere).

## Workflow: Update or Cancel an Event

```bash
# Update subject and time
m365 agent execute --module calendar --operation updateEvent \
  --params '{
    "id": "<eventId>",
    "updates": {
      "subject": "Project Kickoff (rescheduled)",
      "start": {"dateTime":"2026-04-08T14:00:00","timeZone":"UTC"},
      "end":   {"dateTime":"2026-04-08T15:00:00","timeZone":"UTC"}
    }
  }'

# Cancel (delete) an event
m365 agent execute --module calendar --operation deleteEvent \
  --params '{"id":"<eventId>"}'
```

## Operation Routing

| User intent                              | Operation                              |
|------------------------------------------|----------------------------------------|
| "What do I have today?"                  | getToday                               |
| "What's on my calendar this week?"       | getThisWeek                            |
| "Anything in the next 2 hours?"          | getUpcoming (hours: 2)                 |
| "Show April meetings"                    | listEvents (startDate/endDate)         |
| "Create a meeting with..."               | findMeetingTimes → createEvent         |
| "Is Alice free on Monday?"               | getSchedule                            |
| "Accept that invite"                     | acceptEvent                            |
| "Decline the 3pm meeting"                | declineEvent                           |
| "Reschedule to..."                       | updateEvent                            |
| "Cancel the meeting"                     | deleteEvent                            |

## createEvent — Required Shape

```json
{
  "subject": "string (required)",
  "start": { "dateTime": "ISO 8601", "timeZone": "UTC or IANA name" },
  "end":   { "dateTime": "ISO 8601", "timeZone": "UTC or IANA name" }
}
```

Optional fields: `attendees[]`, `location`, `body`, `isOnlineMeeting`, `onlineMeetingProvider`, `recurrence`, `reminderMinutesBeforeStart`.

## Error Handling

| Situation                       | Likely cause                     | Fix                                           |
|---------------------------------|----------------------------------|-----------------------------------------------|
| `Authorization_RequestDenied`   | Missing `Calendars.ReadWrite`    | Re-authenticate with calendar scope           |
| `Request_ResourceNotFound`      | Stale event ID                   | Re-list events to get current IDs             |
| Event not found in getToday     | Calendar timezone mismatch       | Use `getCalendarView` with explicit UTC times |
| `ErrorCalendarDurationExceeded` | Duration > 24 hours              | Split into multiple events                    |
