import { GraphClient } from '../graph-client.js';
import { GraphResponse, GraphRequestOptions } from '../types.js';

interface ListEventsOptions {
  startDate?: string;
  endDate?: string;
  top?: number;
  select?: string[];
}

interface CalendarViewOptions {
  top?: number;
}

export class CalendarOperations {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
  }

  public async listEvents(options?: ListEventsOptions): Promise<GraphResponse<any[]>> {
    const opts: GraphRequestOptions = {};
    const filters: string[] = [];

    if (options?.startDate) {
      filters.push(`start/dateTime ge '${options.startDate}'`);
    }
    if (options?.endDate) {
      filters.push(`end/dateTime le '${options.endDate}'`);
    }
    if (filters.length > 0) {
      opts.filter = filters.join(' and ');
    }
    if (options?.top !== undefined) {
      opts.top = options.top;
    }
    if (options?.select) {
      opts.select = options.select;
    }

    return this.client.get('/me/events', opts);
  }

  public async getEvent(id: string): Promise<GraphResponse<any>> {
    return this.client.get(`/me/events/${id}`);
  }

  public async getCalendarView(startDateTime: string, endDateTime: string, options?: CalendarViewOptions): Promise<GraphResponse<any[]>> {
    const endpoint = `/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
    const opts: GraphRequestOptions = {};
    if (options?.top !== undefined) {
      opts.top = options.top;
    }
    return this.client.get(endpoint, opts);
  }

  public async getToday(): Promise<GraphResponse<any[]>> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.getCalendarView(startOfDay.toISOString(), endOfDay.toISOString());
  }

  public async getThisWeek(): Promise<GraphResponse<any[]>> {
    const now = new Date();
    const day = now.getDay();
    // Monday-based week: if Sunday (0), go back 6 days; otherwise go back (day - 1) days
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return this.getCalendarView(monday.toISOString(), sunday.toISOString());
  }

  public async getUpcoming(hours: number = 24): Promise<GraphResponse<any[]>> {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return this.getCalendarView(now.toISOString(), end.toISOString());
  }

  public async createEvent(event: any): Promise<GraphResponse<any>> {
    return this.client.post('/me/events', event);
  }

  public async updateEvent(id: string, updates: any): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/events/${id}`, updates);
  }

  public async deleteEvent(id: string): Promise<GraphResponse<void>> {
    return this.client.delete(`/me/events/${id}`);
  }

  public async acceptEvent(id: string, comment?: string, sendResponse?: boolean): Promise<GraphResponse<void>> {
    return this.client.post(`/me/events/${id}/accept`, { comment, sendResponse });
  }

  public async declineEvent(id: string, comment?: string, sendResponse?: boolean): Promise<GraphResponse<void>> {
    return this.client.post(`/me/events/${id}/decline`, { comment, sendResponse });
  }

  public async tentativelyAcceptEvent(id: string, comment?: string, sendResponse?: boolean): Promise<GraphResponse<void>> {
    return this.client.post(`/me/events/${id}/tentativelyAccept`, { comment, sendResponse });
  }

  public async findMeetingTimes(params: any): Promise<GraphResponse<any[]>> {
    const response = await this.client.post('/me/findMeetingTimes', params);
    if (response.success) {
      return {
        ...response,
        data: response.data.meetingTimeSuggestions || []
      };
    }
    return { ...response, data: [] };
  }

  public async getSchedule(emails: string[], startDate: string, endDate: string, availabilityViewInterval?: number): Promise<GraphResponse<any[]>> {
    const body: any = {
      schedules: emails,
      startTime: { dateTime: startDate, timeZone: 'UTC' },
      endTime: { dateTime: endDate, timeZone: 'UTC' }
    };
    if (availabilityViewInterval !== undefined) {
      body.availabilityViewInterval = availabilityViewInterval;
    }
    const response = await this.client.post('/me/calendar/getSchedule', body);
    if (response.success) {
      return {
        ...response,
        data: response.data.value || response.data
      };
    }
    return { ...response, data: [] };
  }
}
