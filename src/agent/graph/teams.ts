import { GraphClient } from '../graph-client.js';
import { GraphRequestOptions, GraphResponse } from '../types.js';

interface CreateTeamParams {
  displayName: string;
  description?: string;
  template?: string;
}

interface CreateChannelParams {
  displayName: string;
  description?: string;
  membershipType?: string;
}

interface CreateOnlineMeetingParams {
  subject: string;
  startDateTime: string;
  endDateTime: string;
}

export class TeamsOperations {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
  }

  public async listMyTeams(opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/joinedTeams', opts);
  }

  public async getTeam(teamId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/teams/${teamId}`);
  }

  public async createTeam(params: CreateTeamParams): Promise<GraphResponse<any>> {
    const body: any = {
      displayName: params.displayName,
      description: params.description
    };
    if (params.template !== undefined) {
      body.template = params.template;
    }
    return this.client.post('/teams', body);
  }

  public async archiveTeam(teamId: string): Promise<GraphResponse<any>> {
    return this.client.post(`/teams/${teamId}/archive`, {});
  }

  public async listChannels(teamId: string, opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get(`/teams/${teamId}/channels`, opts);
  }

  public async getChannel(teamId: string, channelId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/teams/${teamId}/channels/${channelId}`);
  }

  public async createChannel(teamId: string, params: CreateChannelParams): Promise<GraphResponse<any>> {
    return this.client.post(`/teams/${teamId}/channels`, {
      displayName: params.displayName,
      description: params.description,
      membershipType: params.membershipType
    });
  }

  public async listChannelMessages(teamId: string, channelId: string, opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get(`/teams/${teamId}/channels/${channelId}/messages`, opts);
  }

  public async sendChannelMessage(teamId: string, channelId: string, content: string, contentType: string = 'text'): Promise<GraphResponse<any>> {
    return this.client.post(`/teams/${teamId}/channels/${channelId}/messages`, {
      body: {
        content,
        contentType
      }
    });
  }

  public async replyToChannelMessage(teamId: string, channelId: string, messageId: string, content: string, contentType: string = 'text'): Promise<GraphResponse<any>> {
    return this.client.post(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`, {
      body: {
        content,
        contentType
      }
    });
  }

  public async listChats(opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/chats', opts);
  }

  public async getChat(chatId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/chats/${chatId}`);
  }

  public async listChatMessages(chatId: string, opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get(`/chats/${chatId}/messages`, opts);
  }

  public async sendChatMessage(chatId: string, content: string, contentType: string = 'text'): Promise<GraphResponse<any>> {
    return this.client.post(`/chats/${chatId}/messages`, {
      body: {
        content,
        contentType
      }
    });
  }

  public async listTeamMembers(teamId: string, opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get(`/teams/${teamId}/members`, opts);
  }

  public async addTeamMember(teamId: string, userId: string, role?: string): Promise<GraphResponse<any>> {
    const body: any = {
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
    };
    if (role) {
      body.roles = [role];
    }
    return this.client.post(`/teams/${teamId}/members`, body);
  }

  public async removeTeamMember(teamId: string, membershipId: string): Promise<GraphResponse<any>> {
    return this.client.delete(`/teams/${teamId}/members/${membershipId}`);
  }

  public async listOnlineMeetings(opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/onlineMeetings', opts);
  }

  public async createOnlineMeeting(params: CreateOnlineMeetingParams): Promise<GraphResponse<any>> {
    return this.client.post('/me/onlineMeetings', {
      subject: params.subject,
      startDateTime: params.startDateTime,
      endDateTime: params.endDateTime
    });
  }

  public async getMeetingTranscript(meetingId: string, transcriptId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content`);
  }

  public async listMeetingAttendanceReports(meetingId: string, opts?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get(`/me/onlineMeetings/${meetingId}/attendanceReports`, opts);
  }

  public async getMyPresence(): Promise<GraphResponse<any>> {
    return this.client.get('/me/presence');
  }

  public async getUserPresence(userId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/users/${userId}/presence`);
  }

  public async setMyPresence(availability: string, activity: string, expirationDuration?: string): Promise<GraphResponse<any>> {
    const body: any = {
      availability,
      activity
    };
    if (expirationDuration !== undefined) {
      body.expirationDuration = expirationDuration;
    }
    return this.client.post('/me/presence/setPresence', body);
  }
}
