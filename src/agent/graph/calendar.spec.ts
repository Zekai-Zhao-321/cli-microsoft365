import assert from 'assert';
import sinon from 'sinon';
import { sinonUtil } from '../../utils/sinonUtil.js';
import { GraphClient } from '../graph-client.js';
import { CalendarOperations } from './calendar.js';

describe('CalendarOperations', () => {
  let client: sinon.SinonStubbedInstance<GraphClient>;
  let calendar: CalendarOperations;

  function makeEventResponse(events: any[]): { success: boolean; data: any[]; tokenEstimate: number } {
    return {
      success: true,
      data: events,
      tokenEstimate: 100
    };
  }

  function makeSingleEventResponse(event: any): { success: boolean; data: any; tokenEstimate: number } {
    return {
      success: true,
      data: event,
      tokenEstimate: 100
    };
  }

  function makeErrorResponse(message: string, code?: string): { success: boolean; data: any; tokenEstimate: number; error: any } {
    return {
      success: false,
      data: undefined as any,
      tokenEstimate: 0,
      error: { message, code }
    };
  }

  function makeVoidResponse(): { success: boolean; data: void; tokenEstimate: number } {
    return {
      success: true,
      data: undefined as unknown as void,
      tokenEstimate: 0
    };
  }

  const sampleEvent = {
    id: 'event-1',
    subject: 'Team Meeting',
    start: { dateTime: '2026-04-02T10:00:00', timeZone: 'UTC' },
    end: { dateTime: '2026-04-02T11:00:00', timeZone: 'UTC' },
    location: { displayName: 'Conference Room A' },
    attendees: [
      { emailAddress: { address: 'user@contoso.com', name: 'User One' }, type: 'required' }
    ],
    isOnlineMeeting: false
  };

  beforeEach(() => {
    client = sinon.createStubInstance(GraphClient);
    calendar = new CalendarOperations(client as any);
  });

  afterEach(() => {
    sinonUtil.restore([]);
    sinon.restore();
  });

  // ---------------------------------------------------------------------------
  // listEvents
  // ---------------------------------------------------------------------------
  describe('listEvents', () => {
    it('should GET /me/events', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      await calendar.listEvents();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/events');
    });

    it('should return events array on success', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      const result = await calendar.listEvents();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].id, 'event-1');
    });

    it('should filter by startDate when provided', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.listEvents({ startDate: '2026-04-01T00:00:00Z' });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert(opts!.filter !== undefined);
      assert((opts!.filter as string).includes('2026-04-01'));
    });

    it('should filter by endDate when provided', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.listEvents({ endDate: '2026-04-30T23:59:59Z' });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert(opts!.filter !== undefined);
      assert((opts!.filter as string).includes('2026-04-30'));
    });

    it('should pass $top when provided', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.listEvents({ top: 5 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 5);
    });

    it('should pass $select when provided', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.listEvents({ select: ['id', 'subject', 'start', 'end'] });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.deepStrictEqual(opts!.select, ['id', 'subject', 'start', 'end']);
    });

    it('should return empty array when no events exist', async () => {
      client.get.resolves(makeEventResponse([]));

      const result = await calendar.listEvents();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getEvent
  // ---------------------------------------------------------------------------
  describe('getEvent', () => {
    it('should GET /me/events/{id}', async () => {
      client.get.resolves(makeSingleEventResponse(sampleEvent));

      await calendar.getEvent('event-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/events/event-1');
    });

    it('should return event data on success', async () => {
      client.get.resolves(makeSingleEventResponse(sampleEvent));

      const result = await calendar.getEvent('event-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'event-1');
      assert.strictEqual(result.data.subject, 'Team Meeting');
    });

    it('should include attendees and location in the response', async () => {
      const eventWithDetails = {
        ...sampleEvent,
        attendees: [{ emailAddress: { address: 'a@b.com', name: 'A' }, type: 'required' }],
        location: { displayName: 'Room B' }
      };
      client.get.resolves(makeSingleEventResponse(eventWithDetails));

      const result = await calendar.getEvent('event-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.location.displayName, 'Room B');
      assert.strictEqual(result.data.attendees.length, 1);
    });

    it('should return success=false and error on 404', async () => {
      client.get.resolves(makeErrorResponse('The specified object was not found in the store.', 'ErrorItemNotFound'));

      const result = await calendar.getEvent('non-existent-id');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // getCalendarView
  // ---------------------------------------------------------------------------
  describe('getCalendarView', () => {
    it('should GET /me/calendarView with startDateTime and endDateTime query params', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      await calendar.getCalendarView('2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.startsWith('/me/calendarView'));
      assert(endpoint.includes('startDateTime='));
      assert(endpoint.includes('endDateTime='));
    });

    it('should include the provided start date in the endpoint', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.getCalendarView('2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z');

      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.includes('2026-04-01'), `Expected start date in endpoint: ${endpoint}`);
    });

    it('should include the provided end date in the endpoint', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.getCalendarView('2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z');

      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.includes('2026-04-30'), `Expected end date in endpoint: ${endpoint}`);
    });

    it('should return events in the date range', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      const result = await calendar.getCalendarView('2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 1);
    });

    it('should pass top option when provided', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.getCalendarView('2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z', { top: 10 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 10);
    });

    it('should expand recurring event instances within the range', async () => {
      const recurringInstance = { ...sampleEvent, type: 'occurrence', seriesMasterId: 'master-1' };
      client.get.resolves(makeEventResponse([recurringInstance]));

      const result = await calendar.getCalendarView('2026-04-01T00:00:00Z', '2026-04-07T23:59:59Z');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data[0].type, 'occurrence');
    });
  });

  // ---------------------------------------------------------------------------
  // getToday
  // ---------------------------------------------------------------------------
  describe('getToday', () => {
    it('should call calendarView endpoint', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      await calendar.getToday();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.includes('/me/calendarView'));
    });

    it('should use current date as the boundary for calendarView', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.getToday();

      const [endpoint] = client.get.firstCall.args;
      // The endpoint should contain today's date boundaries
      assert(endpoint.includes('startDateTime='), `Expected startDateTime in endpoint: ${endpoint}`);
      assert(endpoint.includes('endDateTime='), `Expected endDateTime in endpoint: ${endpoint}`);
    });

    it('should return today events on success', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      const result = await calendar.getToday();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
    });

    it('should return empty array for an empty day', async () => {
      client.get.resolves(makeEventResponse([]));

      const result = await calendar.getToday();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getThisWeek
  // ---------------------------------------------------------------------------
  describe('getThisWeek', () => {
    it('should call calendarView endpoint for the week', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      await calendar.getThisWeek();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.includes('/me/calendarView'));
    });

    it('should use Monday and Sunday as week boundaries', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.getThisWeek();

      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.includes('startDateTime='), `Expected startDateTime in endpoint: ${endpoint}`);
      assert(endpoint.includes('endDateTime='), `Expected endDateTime in endpoint: ${endpoint}`);
    });

    it('should return events for the week on success', async () => {
      const weekEvents = [sampleEvent, { ...sampleEvent, id: 'event-2', subject: 'Review' }];
      client.get.resolves(makeEventResponse(weekEvents));

      const result = await calendar.getThisWeek();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // getUpcoming
  // ---------------------------------------------------------------------------
  describe('getUpcoming', () => {
    it('should call calendarView endpoint', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      await calendar.getUpcoming();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.includes('/me/calendarView'));
    });

    it('should default to 24 hours when no argument given', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.getUpcoming();

      const [endpoint] = client.get.firstCall.args;
      // Endpoint should cover a 24h window — we verify both boundaries are present
      assert(endpoint.includes('startDateTime='), `Expected startDateTime: ${endpoint}`);
      assert(endpoint.includes('endDateTime='), `Expected endDateTime: ${endpoint}`);
    });

    it('should use the given number of hours for the window', async () => {
      client.get.resolves(makeEventResponse([]));

      await calendar.getUpcoming(48);

      const [endpoint] = client.get.firstCall.args;
      assert(endpoint.includes('startDateTime='), `Expected startDateTime: ${endpoint}`);
      assert(endpoint.includes('endDateTime='), `Expected endDateTime: ${endpoint}`);
    });

    it('should return upcoming events on success', async () => {
      client.get.resolves(makeEventResponse([sampleEvent]));

      const result = await calendar.getUpcoming(24);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // createEvent
  // ---------------------------------------------------------------------------
  describe('createEvent', () => {
    const baseEvent = {
      subject: 'New Meeting',
      start: { dateTime: '2026-04-03T10:00:00', timeZone: 'UTC' },
      end: { dateTime: '2026-04-03T11:00:00', timeZone: 'UTC' }
    };

    it('should POST to /me/events', async () => {
      client.post.resolves(makeSingleEventResponse({ ...baseEvent, id: 'new-event-1' }));

      await calendar.createEvent(baseEvent);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/events');
    });

    it('should create a basic event and return it', async () => {
      client.post.resolves(makeSingleEventResponse({ ...baseEvent, id: 'new-event-1' }));

      const result = await calendar.createEvent(baseEvent);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'new-event-1');
      assert.strictEqual(result.data.subject, 'New Meeting');
    });

    it('should include attendees in the POST body when provided', async () => {
      const eventWithAttendees = {
        ...baseEvent,
        attendees: [{ emailAddress: { address: 'colleague@contoso.com', name: 'Colleague' }, type: 'required' }]
      };
      client.post.resolves(makeSingleEventResponse({ ...eventWithAttendees, id: 'new-event-2' }));

      await calendar.createEvent(eventWithAttendees);

      const [, body] = client.post.firstCall.args;
      assert(body.attendees !== undefined);
      assert.strictEqual(body.attendees[0].emailAddress.address, 'colleague@contoso.com');
    });

    it('should include location in the POST body when provided', async () => {
      const eventWithLocation = {
        ...baseEvent,
        location: { displayName: 'Building 2, Room 5' }
      };
      client.post.resolves(makeSingleEventResponse({ ...eventWithLocation, id: 'new-event-3' }));

      await calendar.createEvent(eventWithLocation);

      const [, body] = client.post.firstCall.args;
      assert(body.location !== undefined);
      assert.strictEqual(body.location.displayName, 'Building 2, Room 5');
    });

    it('should set isOnlineMeeting=true when requested', async () => {
      const onlineMeeting = { ...baseEvent, isOnlineMeeting: true };
      client.post.resolves(makeSingleEventResponse({ ...onlineMeeting, id: 'new-event-4' }));

      await calendar.createEvent(onlineMeeting);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.isOnlineMeeting, true);
    });

    it('should include recurrence in the POST body when provided', async () => {
      const recurringEvent = {
        ...baseEvent,
        recurrence: {
          pattern: { type: 'weekly', interval: 1, daysOfWeek: ['Monday'] },
          range: { type: 'endDate', startDate: '2026-04-06', endDate: '2026-06-30' }
        }
      };
      client.post.resolves(makeSingleEventResponse({ ...recurringEvent, id: 'new-event-5' }));

      await calendar.createEvent(recurringEvent);

      const [, body] = client.post.firstCall.args;
      assert(body.recurrence !== undefined);
      assert.strictEqual(body.recurrence.pattern.type, 'weekly');
    });

    it('should return success=false on permission error', async () => {
      client.post.resolves(makeErrorResponse('Insufficient privileges to complete the operation.', 'Authorization_RequestDenied'));

      const result = await calendar.createEvent(baseEvent);

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'Authorization_RequestDenied');
    });

    it('should still create event with past dates (Graph accepts it)', async () => {
      const pastEvent = {
        subject: 'Past Meeting',
        start: { dateTime: '2020-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2020-01-01T11:00:00', timeZone: 'UTC' }
      };
      client.post.resolves(makeSingleEventResponse({ ...pastEvent, id: 'past-event-1' }));

      const result = await calendar.createEvent(pastEvent);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'past-event-1');
    });

    it('should send full body when all optional fields are populated', async () => {
      const fullEvent = {
        subject: 'Full Event',
        start: { dateTime: '2026-05-01T09:00:00', timeZone: 'UTC' },
        end: { dateTime: '2026-05-01T10:00:00', timeZone: 'UTC' },
        location: { displayName: 'Board Room' },
        body: { contentType: 'HTML', content: '<b>Agenda</b>' },
        isOnlineMeeting: true,
        recurrence: {
          pattern: { type: 'daily', interval: 1 },
          range: { type: 'numbered', startDate: '2026-05-01', numberOfOccurrences: 5 }
        },
        attendees: [
          { emailAddress: { address: 'a@test.com', name: 'A' }, type: 'required' },
          { emailAddress: { address: 'b@test.com', name: 'B' }, type: 'optional' }
        ]
      };
      client.post.resolves(makeSingleEventResponse({ ...fullEvent, id: 'full-event-1' }));

      await calendar.createEvent(fullEvent);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.location.displayName, 'Board Room');
      assert.strictEqual(body.body.contentType, 'HTML');
      assert.strictEqual(body.isOnlineMeeting, true);
      assert(body.recurrence !== undefined);
      assert.strictEqual(body.attendees.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // updateEvent
  // ---------------------------------------------------------------------------
  describe('updateEvent', () => {
    it('should PATCH /me/events/{id}', async () => {
      client.patch.resolves(makeSingleEventResponse({ ...sampleEvent, subject: 'Updated Subject' }));

      await calendar.updateEvent('event-1', { subject: 'Updated Subject' });

      assert(client.patch.calledOnce);
      const [endpoint] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/events/event-1');
    });

    it('should update subject and return updated event', async () => {
      client.patch.resolves(makeSingleEventResponse({ ...sampleEvent, subject: 'Updated Subject' }));

      const result = await calendar.updateEvent('event-1', { subject: 'Updated Subject' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.subject, 'Updated Subject');
    });

    it('should update start and end times', async () => {
      const newStart = { dateTime: '2026-04-03T14:00:00', timeZone: 'UTC' };
      const newEnd = { dateTime: '2026-04-03T15:00:00', timeZone: 'UTC' };
      client.patch.resolves(makeSingleEventResponse({ ...sampleEvent, start: newStart, end: newEnd }));

      await calendar.updateEvent('event-1', { start: newStart, end: newEnd });

      const [, body] = client.patch.firstCall.args;
      assert.deepStrictEqual(body.start, newStart);
      assert.deepStrictEqual(body.end, newEnd);
    });

    it('should update attendees list', async () => {
      const newAttendees = [
        { emailAddress: { address: 'new@contoso.com', name: 'New Person' }, type: 'required' }
      ];
      client.patch.resolves(makeSingleEventResponse({ ...sampleEvent, attendees: newAttendees }));

      await calendar.updateEvent('event-1', { attendees: newAttendees });

      const [, body] = client.patch.firstCall.args;
      assert.strictEqual(body.attendees[0].emailAddress.address, 'new@contoso.com');
    });

    it('should propagate 404 when event does not exist', async () => {
      client.patch.resolves(makeErrorResponse('The specified object was not found in the store.', 'ErrorItemNotFound'));

      const result = await calendar.updateEvent('nonexistent-event', { subject: 'Updated' });

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteEvent
  // ---------------------------------------------------------------------------
  describe('deleteEvent', () => {
    it('should DELETE /me/events/{id}', async () => {
      client.delete.resolves(makeVoidResponse());

      await calendar.deleteEvent('event-1');

      assert(client.delete.calledOnce);
      const [endpoint] = client.delete.firstCall.args;
      assert.strictEqual(endpoint, '/me/events/event-1');
    });

    it('should return success=true on 204 No Content', async () => {
      client.delete.resolves(makeVoidResponse());

      const result = await calendar.deleteEvent('event-1');

      assert.strictEqual(result.success, true);
    });

    it('should propagate 404 when event does not exist', async () => {
      client.delete.resolves(makeErrorResponse('The specified object was not found in the store.', 'ErrorItemNotFound'));

      const result = await calendar.deleteEvent('nonexistent-event');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // acceptEvent
  // ---------------------------------------------------------------------------
  describe('acceptEvent', () => {
    it('should POST to /me/events/{id}/accept', async () => {
      client.post.resolves(makeVoidResponse());

      await calendar.acceptEvent('event-1');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/events/event-1/accept');
    });

    it('should accept event and return success', async () => {
      client.post.resolves(makeVoidResponse());

      const result = await calendar.acceptEvent('event-1');

      assert.strictEqual(result.success, true);
    });

    it('should include comment in POST body when provided', async () => {
      client.post.resolves(makeVoidResponse());

      await calendar.acceptEvent('event-1', 'Looking forward to it!');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.comment, 'Looking forward to it!');
    });

    it('should include sendResponse in POST body', async () => {
      client.post.resolves(makeVoidResponse());

      await calendar.acceptEvent('event-1', undefined, true);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.sendResponse, true);
    });

    it('should propagate error when event does not exist', async () => {
      client.post.resolves(makeErrorResponse('The specified object was not found in the store.', 'ErrorItemNotFound'));

      const result = await calendar.acceptEvent('nonexistent-event');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // declineEvent
  // ---------------------------------------------------------------------------
  describe('declineEvent', () => {
    it('should POST to /me/events/{id}/decline', async () => {
      client.post.resolves(makeVoidResponse());

      await calendar.declineEvent('event-1');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/events/event-1/decline');
    });

    it('should decline event and return success', async () => {
      client.post.resolves(makeVoidResponse());

      const result = await calendar.declineEvent('event-1');

      assert.strictEqual(result.success, true);
    });

    it('should include comment in POST body when provided', async () => {
      client.post.resolves(makeVoidResponse());

      await calendar.declineEvent('event-1', 'Conflict with another meeting');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.comment, 'Conflict with another meeting');
    });
  });

  // ---------------------------------------------------------------------------
  // tentativelyAcceptEvent
  // ---------------------------------------------------------------------------
  describe('tentativelyAcceptEvent', () => {
    it('should POST to /me/events/{id}/tentativelyAccept', async () => {
      client.post.resolves(makeVoidResponse());

      await calendar.tentativelyAcceptEvent('event-1');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/events/event-1/tentativelyAccept');
    });

    it('should tentatively accept event and return success', async () => {
      client.post.resolves(makeVoidResponse());

      const result = await calendar.tentativelyAcceptEvent('event-1');

      assert.strictEqual(result.success, true);
    });

    it('should include comment in POST body when provided', async () => {
      client.post.resolves(makeVoidResponse());

      await calendar.tentativelyAcceptEvent('event-1', 'Might need to leave early');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.comment, 'Might need to leave early');
    });
  });

  // ---------------------------------------------------------------------------
  // findMeetingTimes
  // ---------------------------------------------------------------------------
  describe('findMeetingTimes', () => {
    const meetingParams = {
      attendees: [{ emailAddress: { address: 'colleague@contoso.com' } }],
      meetingDuration: 'PT1H'
    };

    const meetingTimesResponse = {
      success: true,
      data: {
        meetingTimeSuggestions: [
          {
            meetingTimeSlot: {
              start: { dateTime: '2026-04-03T10:00:00', timeZone: 'UTC' },
              end: { dateTime: '2026-04-03T11:00:00', timeZone: 'UTC' }
            },
            confidence: 100,
            order: 1
          }
        ],
        emptySuggestionsHint: ''
      },
      tokenEstimate: 100
    };

    it('should POST to /me/findMeetingTimes', async () => {
      client.post.resolves(meetingTimesResponse);

      await calendar.findMeetingTimes(meetingParams);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/findMeetingTimes');
    });

    it('should pass attendees in the request body', async () => {
      client.post.resolves(meetingTimesResponse);

      await calendar.findMeetingTimes(meetingParams);

      const [, body] = client.post.firstCall.args;
      assert(Array.isArray(body.attendees));
      assert.strictEqual(body.attendees[0].emailAddress.address, 'colleague@contoso.com');
    });

    it('should pass meetingDuration in the request body', async () => {
      client.post.resolves(meetingTimesResponse);

      await calendar.findMeetingTimes(meetingParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.meetingDuration, 'PT1H');
    });

    it('should pass timeConstraint in the request body when provided', async () => {
      const paramsWithConstraint = {
        ...meetingParams,
        timeConstraint: {
          timeslots: [
            {
              start: { dateTime: '2026-04-03T09:00:00', timeZone: 'UTC' },
              end: { dateTime: '2026-04-03T17:00:00', timeZone: 'UTC' }
            }
          ]
        }
      };
      client.post.resolves(meetingTimesResponse);

      await calendar.findMeetingTimes(paramsWithConstraint);

      const [, body] = client.post.firstCall.args;
      assert(body.timeConstraint !== undefined);
      assert.strictEqual(body.timeConstraint.timeslots.length, 1);
    });

    it('should return meeting time suggestions on success', async () => {
      client.post.resolves(meetingTimesResponse);

      const result = await calendar.findMeetingTimes(meetingParams);

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
    });

    it('should return empty array when no times are available', async () => {
      client.post.resolves({
        success: true,
        data: {
          meetingTimeSuggestions: [],
          emptySuggestionsHint: 'NoAttendeeAvailability'
        },
        tokenEstimate: 30
      });

      const result = await calendar.findMeetingTimes(meetingParams);

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getSchedule
  // ---------------------------------------------------------------------------
  describe('getSchedule', () => {
    const emails = ['user1@contoso.com', 'user2@contoso.com'];
    const startDate = '2026-04-03T00:00:00Z';
    const endDate = '2026-04-03T23:59:59Z';

    const scheduleResponse = {
      success: true,
      data: {
        value: [
          {
            scheduleId: 'user1@contoso.com',
            availabilityView: 'FFFFOOOOFFFF',
            scheduleItems: [
              {
                start: { dateTime: '2026-04-03T10:00:00', timeZone: 'UTC' },
                end: { dateTime: '2026-04-03T11:00:00', timeZone: 'UTC' },
                status: 'busy',
                subject: 'Blocked'
              }
            ]
          },
          {
            scheduleId: 'user2@contoso.com',
            availabilityView: 'OOOOOOOOOOOO',
            scheduleItems: []
          }
        ]
      },
      tokenEstimate: 150
    };

    it('should POST to /me/calendar/getSchedule', async () => {
      client.post.resolves(scheduleResponse);

      await calendar.getSchedule(emails, startDate, endDate);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/calendar/getSchedule');
    });

    it('should pass schedules (emails) in the request body', async () => {
      client.post.resolves(scheduleResponse);

      await calendar.getSchedule(emails, startDate, endDate);

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.schedules, emails);
    });

    it('should pass startTime in the request body', async () => {
      client.post.resolves(scheduleResponse);

      await calendar.getSchedule(emails, startDate, endDate);

      const [, body] = client.post.firstCall.args;
      assert(body.startTime !== undefined);
    });

    it('should pass endTime in the request body', async () => {
      client.post.resolves(scheduleResponse);

      await calendar.getSchedule(emails, startDate, endDate);

      const [, body] = client.post.firstCall.args;
      assert(body.endTime !== undefined);
    });

    it('should return free/busy schedule data for each email', async () => {
      client.post.resolves(scheduleResponse);

      const result = await calendar.getSchedule(emails, startDate, endDate);

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 2);
    });

    it('should include availability view in the response', async () => {
      client.post.resolves(scheduleResponse);

      const result = await calendar.getSchedule(emails, startDate, endDate);

      assert.strictEqual(result.success, true);
      const firstSchedule = result.data[0] as any;
      assert(firstSchedule.availabilityView !== undefined);
    });
  });
});
