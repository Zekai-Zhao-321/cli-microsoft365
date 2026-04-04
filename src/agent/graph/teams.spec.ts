import assert from 'assert';
import sinon from 'sinon';
import { sinonUtil } from '../../utils/sinonUtil.js';
import { GraphClient } from '../graph-client.js';
import { TeamsOperations } from './teams.js';

describe('TeamsOperations', () => {
  let client: sinon.SinonStubbedInstance<GraphClient>;
  let teams: TeamsOperations;

  function makeListResponse(items: any[]): { success: boolean; data: any[]; tokenEstimate: number } {
    return {
      success: true,
      data: items,
      tokenEstimate: 100
    };
  }

  function makeSingleResponse(item: any): { success: boolean; data: any; tokenEstimate: number } {
    return {
      success: true,
      data: item,
      tokenEstimate: 100
    };
  }

  function makeVoidResponse(): { success: boolean; data: any; tokenEstimate: number } {
    return {
      success: true,
      data: {},
      tokenEstimate: 0
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

  const sampleTeam = {
    id: 'team-1',
    displayName: 'Engineering Team',
    description: 'Main engineering team',
    isArchived: false
  };

  const sampleChannel = {
    id: 'channel-1',
    displayName: 'General',
    description: 'General channel',
    membershipType: 'standard'
  };

  const sampleMessage = {
    id: 'msg-1',
    body: { content: 'Hello team!', contentType: 'text' },
    createdDateTime: '2026-04-02T10:00:00Z'
  };

  const sampleChat = {
    id: 'chat-1',
    chatType: 'oneOnOne',
    topic: null
  };

  const sampleMember = {
    id: 'membership-1',
    userId: 'user-1',
    displayName: 'Jane Doe',
    roles: []
  };

  const sampleMeeting = {
    id: 'meeting-1',
    subject: 'Weekly Sync',
    startDateTime: '2026-04-03T10:00:00Z',
    endDateTime: '2026-04-03T11:00:00Z'
  };

  beforeEach(() => {
    client = sinon.createStubInstance(GraphClient);
    teams = new TeamsOperations(client as any);
  });

  afterEach(() => {
    sinonUtil.restore([]);
    sinon.restore();
  });

  // ---------------------------------------------------------------------------
  // listMyTeams
  // ---------------------------------------------------------------------------
  describe('listMyTeams', () => {
    it('should GET /me/joinedTeams', async () => {
      client.get.resolves(makeListResponse([sampleTeam]));

      await teams.listMyTeams();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/joinedTeams');
    });

    it('should return list of teams on success', async () => {
      client.get.resolves(makeListResponse([sampleTeam]));

      const result = await teams.listMyTeams();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].id, 'team-1');
    });

    it('should return empty array when user has no teams', async () => {
      client.get.resolves(makeListResponse([]));

      const result = await teams.listMyTeams();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should forward opts to client.get when provided', async () => {
      client.get.resolves(makeListResponse([]));

      await teams.listMyTeams({ top: 10 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 10);
    });

    it('should return error response on failure', async () => {
      client.get.resolves(makeErrorResponse('Unauthorized', 'InvalidAuthenticationToken'));

      const result = await teams.listMyTeams();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });

    it('should propagate rejection when client.get rejects', async () => {
      const err = new Error('Network error');
      client.get.rejects(err);

      await assert.rejects(() => teams.listMyTeams(), /Network error/);
    });
  });

  // ---------------------------------------------------------------------------
  // getTeam
  // ---------------------------------------------------------------------------
  describe('getTeam', () => {
    it('should GET /teams/{teamId}', async () => {
      client.get.resolves(makeSingleResponse(sampleTeam));

      await teams.getTeam('team-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1');
    });

    it('should return team data on success', async () => {
      client.get.resolves(makeSingleResponse(sampleTeam));

      const result = await teams.getTeam('team-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'team-1');
      assert.strictEqual(result.data.displayName, 'Engineering Team');
    });

    it('should return error on 404', async () => {
      client.get.resolves(makeErrorResponse('The specified object was not found.', 'ErrorItemNotFound'));

      const result = await teams.getTeam('non-existent-team');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });

    it('should propagate rejection when client.get rejects', async () => {
      const err = new Error('Service unavailable');
      client.get.rejects(err);

      await assert.rejects(() => teams.getTeam('team-1'), /Service unavailable/);
    });
  });

  // ---------------------------------------------------------------------------
  // createTeam
  // ---------------------------------------------------------------------------
  describe('createTeam', () => {
    const createParams = {
      displayName: 'New Project Team',
      description: 'Team for the new project',
      template: "team"
    };

    it('should POST to /teams', async () => {
      client.post.resolves(makeSingleResponse({ ...createParams, id: 'team-2' }));

      await teams.createTeam(createParams);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/teams');
    });

    it('should include displayName in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...createParams, id: 'team-2' }));

      await teams.createTeam(createParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.displayName, 'New Project Team');
    });

    it('should include description in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...createParams, id: 'team-2' }));

      await teams.createTeam(createParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.description, 'Team for the new project');
    });

    it('should include template in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...createParams, id: 'team-2' }));

      await teams.createTeam(createParams);

      const [, body] = client.post.firstCall.args;
      assert(body.template !== undefined);
    });

    it('should return created team data on success', async () => {
      client.post.resolves(makeSingleResponse({ ...createParams, id: 'team-2' }));

      const result = await teams.createTeam(createParams);

      assert.strictEqual(result.success, true);
    });

    it('should return error response on failure', async () => {
      client.post.resolves(makeErrorResponse('Conflict', 'Conflict'));

      const result = await teams.createTeam(createParams);

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });

    it('should propagate rejection when client.post rejects', async () => {
      const err = new Error('Timeout');
      client.post.rejects(err);

      await assert.rejects(() => teams.createTeam(createParams), /Timeout/);
    });
  });

  // ---------------------------------------------------------------------------
  // archiveTeam
  // ---------------------------------------------------------------------------
  describe('archiveTeam', () => {
    it('should POST to /teams/{teamId}/archive', async () => {
      client.post.resolves(makeVoidResponse());

      await teams.archiveTeam('team-1');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/archive');
    });

    it('should return success on archive', async () => {
      client.post.resolves(makeVoidResponse());

      const result = await teams.archiveTeam('team-1');

      assert.strictEqual(result.success, true);
    });

    it('should return error on failure', async () => {
      client.post.resolves(makeErrorResponse('Team not found', 'ErrorItemNotFound'));

      const result = await teams.archiveTeam('bad-team');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listChannels
  // ---------------------------------------------------------------------------
  describe('listChannels', () => {
    it('should GET /teams/{teamId}/channels', async () => {
      client.get.resolves(makeListResponse([sampleChannel]));

      await teams.listChannels('team-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/channels');
    });

    it('should return channels array on success', async () => {
      client.get.resolves(makeListResponse([sampleChannel]));

      const result = await teams.listChannels('team-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'channel-1');
    });

    it('should return empty array when team has no channels', async () => {
      client.get.resolves(makeListResponse([]));

      const result = await teams.listChannels('team-1');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should return error response on failure', async () => {
      client.get.resolves(makeErrorResponse('Team not found', 'ErrorItemNotFound'));

      const result = await teams.listChannels('non-existent-team');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });

    it('should propagate rejection when client.get rejects', async () => {
      client.get.rejects(new Error('Forbidden'));

      await assert.rejects(() => teams.listChannels('team-1'), /Forbidden/);
    });
  });

  // ---------------------------------------------------------------------------
  // getChannel
  // ---------------------------------------------------------------------------
  describe('getChannel', () => {
    it('should GET /teams/{teamId}/channels/{channelId}', async () => {
      client.get.resolves(makeSingleResponse(sampleChannel));

      await teams.getChannel('team-1', 'channel-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/channels/channel-1');
    });

    it('should return channel data on success', async () => {
      client.get.resolves(makeSingleResponse(sampleChannel));

      const result = await teams.getChannel('team-1', 'channel-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'channel-1');
      assert.strictEqual(result.data.displayName, 'General');
    });

    it('should return error on 404', async () => {
      client.get.resolves(makeErrorResponse('Channel not found', 'ErrorItemNotFound'));

      const result = await teams.getChannel('team-1', 'non-existent-channel');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // createChannel
  // ---------------------------------------------------------------------------
  describe('createChannel', () => {
    const channelParams = {
      displayName: 'announcements',
      description: 'Company-wide announcements',
      membershipType: 'standard'
    };

    it('should POST to /teams/{teamId}/channels', async () => {
      client.post.resolves(makeSingleResponse({ ...channelParams, id: 'channel-2' }));

      await teams.createChannel('team-1', channelParams);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/channels');
    });

    it('should include displayName in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...channelParams, id: 'channel-2' }));

      await teams.createChannel('team-1', channelParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.displayName, 'announcements');
    });

    it('should include description in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...channelParams, id: 'channel-2' }));

      await teams.createChannel('team-1', channelParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.description, 'Company-wide announcements');
    });

    it('should include membershipType in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...channelParams, id: 'channel-2' }));

      await teams.createChannel('team-1', channelParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.membershipType, 'standard');
    });

    it('should return created channel on success', async () => {
      client.post.resolves(makeSingleResponse({ ...channelParams, id: 'channel-2' }));

      const result = await teams.createChannel('team-1', channelParams);

      assert.strictEqual(result.success, true);
    });

    it('should return error response on failure', async () => {
      client.post.resolves(makeErrorResponse('Channel already exists', 'Conflict'));

      const result = await teams.createChannel('team-1', channelParams);

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });

    it('should propagate rejection when client.post rejects', async () => {
      client.post.rejects(new Error('Network error'));

      await assert.rejects(() => teams.createChannel('team-1', channelParams), /Network error/);
    });
  });

  // ---------------------------------------------------------------------------
  // listChannelMessages
  // ---------------------------------------------------------------------------
  describe('listChannelMessages', () => {
    it('should GET /teams/{teamId}/channels/{channelId}/messages', async () => {
      client.get.resolves(makeListResponse([sampleMessage]));

      await teams.listChannelMessages('team-1', 'channel-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/channels/channel-1/messages');
    });

    it('should return messages array on success', async () => {
      client.get.resolves(makeListResponse([sampleMessage]));

      const result = await teams.listChannelMessages('team-1', 'channel-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'msg-1');
    });

    it('should forward opts to client.get when provided', async () => {
      client.get.resolves(makeListResponse([]));

      await teams.listChannelMessages('team-1', 'channel-1', { top: 5 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 5);
    });

    it('should return empty array when channel has no messages', async () => {
      client.get.resolves(makeListResponse([]));

      const result = await teams.listChannelMessages('team-1', 'channel-1');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // sendChannelMessage
  // ---------------------------------------------------------------------------
  describe('sendChannelMessage', () => {
    it('should POST to /teams/{teamId}/channels/{channelId}/messages', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      await teams.sendChannelMessage('team-1', 'channel-1', 'Hello team!');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/channels/channel-1/messages');
    });

    it('should include content in POST body', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      await teams.sendChannelMessage('team-1', 'channel-1', 'Hello team!');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.body.content, 'Hello team!');
    });

    it('should default contentType to text when not specified', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      await teams.sendChannelMessage('team-1', 'channel-1', 'Hello team!');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.body.contentType, 'text');
    });

    it('should use provided contentType when specified', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      await teams.sendChannelMessage('team-1', 'channel-1', '<b>Hello</b>', 'html');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.body.contentType, 'html');
    });

    it('should return created message on success', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      const result = await teams.sendChannelMessage('team-1', 'channel-1', 'Hello!');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // replyToChannelMessage
  // ---------------------------------------------------------------------------
  describe('replyToChannelMessage', () => {
    it('should POST to /teams/{teamId}/channels/{channelId}/messages/{messageId}/replies', async () => {
      client.post.resolves(makeSingleResponse({ ...sampleMessage, id: 'reply-1' }));

      await teams.replyToChannelMessage('team-1', 'channel-1', 'msg-1', 'Agree!');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/channels/channel-1/messages/msg-1/replies');
    });

    it('should include content in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...sampleMessage, id: 'reply-1' }));

      await teams.replyToChannelMessage('team-1', 'channel-1', 'msg-1', 'Agree!');

      const [, body] = client.post.firstCall.args;
      assert(body.body !== undefined);
      assert.strictEqual(body.body.content, 'Agree!');
    });

    it('should return the reply message on success', async () => {
      client.post.resolves(makeSingleResponse({ ...sampleMessage, id: 'reply-1' }));

      const result = await teams.replyToChannelMessage('team-1', 'channel-1', 'msg-1', 'Agree!');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // listChats
  // ---------------------------------------------------------------------------
  describe('listChats', () => {
    it('should GET /me/chats', async () => {
      client.get.resolves(makeListResponse([sampleChat]));

      await teams.listChats();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/chats');
    });

    it('should return chats array on success', async () => {
      client.get.resolves(makeListResponse([sampleChat]));

      const result = await teams.listChats();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'chat-1');
    });

    it('should forward opts when provided', async () => {
      client.get.resolves(makeListResponse([]));

      await teams.listChats({ top: 20 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 20);
    });

    it('should return empty array when user has no chats', async () => {
      client.get.resolves(makeListResponse([]));

      const result = await teams.listChats();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getChat
  // ---------------------------------------------------------------------------
  describe('getChat', () => {
    it('should GET /chats/{chatId}', async () => {
      client.get.resolves(makeSingleResponse(sampleChat));

      await teams.getChat('chat-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/chats/chat-1');
    });

    it('should return chat data on success', async () => {
      client.get.resolves(makeSingleResponse(sampleChat));

      const result = await teams.getChat('chat-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'chat-1');
      assert.strictEqual(result.data.chatType, 'oneOnOne');
    });

    it('should return error on 404', async () => {
      client.get.resolves(makeErrorResponse('Chat not found', 'ErrorItemNotFound'));

      const result = await teams.getChat('non-existent-chat');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listChatMessages
  // ---------------------------------------------------------------------------
  describe('listChatMessages', () => {
    it('should GET /chats/{chatId}/messages', async () => {
      client.get.resolves(makeListResponse([sampleMessage]));

      await teams.listChatMessages('chat-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/chats/chat-1/messages');
    });

    it('should return messages array on success', async () => {
      client.get.resolves(makeListResponse([sampleMessage]));

      const result = await teams.listChatMessages('chat-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'msg-1');
    });

    it('should forward opts to client.get when provided', async () => {
      client.get.resolves(makeListResponse([]));

      await teams.listChatMessages('chat-1', { top: 50 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 50);
    });
  });

  // ---------------------------------------------------------------------------
  // sendChatMessage
  // ---------------------------------------------------------------------------
  describe('sendChatMessage', () => {
    it('should POST to /chats/{chatId}/messages', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      await teams.sendChatMessage('chat-1', 'Hi there!');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/chats/chat-1/messages');
    });

    it('should include content in POST body', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      await teams.sendChatMessage('chat-1', 'Hi there!');

      const [, body] = client.post.firstCall.args;
      assert(body.body !== undefined);
      assert.strictEqual(body.body.content, 'Hi there!');
    });

    it('should return sent message on success', async () => {
      client.post.resolves(makeSingleResponse(sampleMessage));

      const result = await teams.sendChatMessage('chat-1', 'Hi there!');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // listTeamMembers
  // ---------------------------------------------------------------------------
  describe('listTeamMembers', () => {
    it('should GET /teams/{teamId}/members', async () => {
      client.get.resolves(makeListResponse([sampleMember]));

      await teams.listTeamMembers('team-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/members');
    });

    it('should return members array on success', async () => {
      client.get.resolves(makeListResponse([sampleMember]));

      const result = await teams.listTeamMembers('team-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'membership-1');
    });

    it('should return empty array when team has no members', async () => {
      client.get.resolves(makeListResponse([]));

      const result = await teams.listTeamMembers('team-1');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // addTeamMember
  // ---------------------------------------------------------------------------
  describe('addTeamMember', () => {
    it('should POST to /teams/{teamId}/members', async () => {
      client.post.resolves(makeSingleResponse(sampleMember));

      await teams.addTeamMember('team-1', 'user-2');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/members');
    });

    it('should include userId in POST body', async () => {
      client.post.resolves(makeSingleResponse(sampleMember));

      await teams.addTeamMember('team-1', 'user-2');

      const [, body] = client.post.firstCall.args;
      assert(JSON.stringify(body).includes('user-2'));
    });

    it('should include role in POST body when provided', async () => {
      client.post.resolves(makeSingleResponse({ ...sampleMember, roles: ['owner'] }));

      await teams.addTeamMember('team-1', 'user-2', 'owner');

      const [, body] = client.post.firstCall.args;
      assert(body.roles !== undefined);
      assert(body.roles.includes('owner'));
    });

    it('should return added member on success', async () => {
      client.post.resolves(makeSingleResponse(sampleMember));

      const result = await teams.addTeamMember('team-1', 'user-2');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // removeTeamMember
  // ---------------------------------------------------------------------------
  describe('removeTeamMember', () => {
    it('should DELETE /teams/{teamId}/members/{membershipId}', async () => {
      client.delete.resolves(makeVoidResponse());

      await teams.removeTeamMember('team-1', 'membership-1');

      assert(client.delete.calledOnce);
      const [endpoint] = client.delete.firstCall.args;
      assert.strictEqual(endpoint, '/teams/team-1/members/membership-1');
    });

    it('should return success on removal', async () => {
      client.delete.resolves(makeVoidResponse());

      const result = await teams.removeTeamMember('team-1', 'membership-1');

      assert.strictEqual(result.success, true);
    });

    it('should return error when membership not found', async () => {
      client.delete.resolves(makeErrorResponse('Membership not found', 'ErrorItemNotFound'));

      const result = await teams.removeTeamMember('team-1', 'bad-membership');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listOnlineMeetings
  // ---------------------------------------------------------------------------
  describe('listOnlineMeetings', () => {
    it('should GET /me/onlineMeetings', async () => {
      client.get.resolves(makeListResponse([sampleMeeting]));

      await teams.listOnlineMeetings();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/onlineMeetings');
    });

    it('should return meetings array on success', async () => {
      client.get.resolves(makeListResponse([sampleMeeting]));

      const result = await teams.listOnlineMeetings();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'meeting-1');
    });

    it('should return empty array when user has no meetings', async () => {
      client.get.resolves(makeListResponse([]));

      const result = await teams.listOnlineMeetings();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // createOnlineMeeting
  // ---------------------------------------------------------------------------
  describe('createOnlineMeeting', () => {
    const meetingParams = {
      subject: 'Project Kickoff',
      startDateTime: '2026-04-10T14:00:00Z',
      endDateTime: '2026-04-10T15:00:00Z'
    };

    it('should POST to /me/onlineMeetings', async () => {
      client.post.resolves(makeSingleResponse({ ...meetingParams, id: 'meeting-2' }));

      await teams.createOnlineMeeting(meetingParams);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/onlineMeetings');
    });

    it('should include subject in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...meetingParams, id: 'meeting-2' }));

      await teams.createOnlineMeeting(meetingParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.subject, 'Project Kickoff');
    });

    it('should include startDateTime in POST body', async () => {
      client.post.resolves(makeSingleResponse({ ...meetingParams, id: 'meeting-2' }));

      await teams.createOnlineMeeting(meetingParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.startDateTime, '2026-04-10T14:00:00Z');
    });

    it('should return created meeting on success', async () => {
      client.post.resolves(makeSingleResponse({ ...meetingParams, id: 'meeting-2' }));

      const result = await teams.createOnlineMeeting(meetingParams);

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // getMeetingTranscript
  // ---------------------------------------------------------------------------
  describe('getMeetingTranscript', () => {
    it('should GET /me/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content', async () => {
      client.get.resolves(makeSingleResponse({ content: 'transcript text' }));

      await teams.getMeetingTranscript('meeting-1', 'transcript-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/onlineMeetings/meeting-1/transcripts/transcript-1/content');
    });

    it('should return transcript content on success', async () => {
      client.get.resolves(makeSingleResponse({ content: 'transcript text' }));

      const result = await teams.getMeetingTranscript('meeting-1', 'transcript-1');

      assert.strictEqual(result.success, true);
    });

    it('should return error when transcript not found', async () => {
      client.get.resolves(makeErrorResponse('Transcript not found', 'ErrorItemNotFound'));

      const result = await teams.getMeetingTranscript('meeting-1', 'bad-transcript');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listMeetingAttendanceReports
  // ---------------------------------------------------------------------------
  describe('listMeetingAttendanceReports', () => {
    it('should GET /me/onlineMeetings/{meetingId}/attendanceReports', async () => {
      client.get.resolves(makeListResponse([{ id: 'report-1', totalParticipantCount: 5 }]));

      await teams.listMeetingAttendanceReports('meeting-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/onlineMeetings/meeting-1/attendanceReports');
    });

    it('should return attendance reports on success', async () => {
      client.get.resolves(makeListResponse([{ id: 'report-1', totalParticipantCount: 5 }]));

      const result = await teams.listMeetingAttendanceReports('meeting-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'report-1');
    });

    it('should return empty array when no reports exist', async () => {
      client.get.resolves(makeListResponse([]));

      const result = await teams.listMeetingAttendanceReports('meeting-1');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getMyPresence
  // ---------------------------------------------------------------------------
  describe('getMyPresence', () => {
    it('should GET /me/presence', async () => {
      client.get.resolves(makeSingleResponse({ availability: 'Available', activity: 'Available' }));

      await teams.getMyPresence();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/presence');
    });

    it('should return presence data on success', async () => {
      client.get.resolves(makeSingleResponse({ availability: 'Available', activity: 'Available' }));

      const result = await teams.getMyPresence();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.availability, 'Available');
    });

    it('should return error on failure', async () => {
      client.get.resolves(makeErrorResponse('Unauthorized', 'InvalidAuthenticationToken'));

      const result = await teams.getMyPresence();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserPresence
  // ---------------------------------------------------------------------------
  describe('getUserPresence', () => {
    it('should GET /users/{userId}/presence', async () => {
      client.get.resolves(makeSingleResponse({ availability: 'Busy', activity: 'InAMeeting' }));

      await teams.getUserPresence('user-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/user-1/presence');
    });

    it('should return user presence data on success', async () => {
      client.get.resolves(makeSingleResponse({ availability: 'Busy', activity: 'InAMeeting' }));

      const result = await teams.getUserPresence('user-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.availability, 'Busy');
      assert.strictEqual(result.data.activity, 'InAMeeting');
    });

    it('should return error when user not found', async () => {
      client.get.resolves(makeErrorResponse('User not found', 'ErrorItemNotFound'));

      const result = await teams.getUserPresence('non-existent-user');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // setMyPresence
  // ---------------------------------------------------------------------------
  describe('setMyPresence', () => {
    it('should POST to /me/presence/setPresence', async () => {
      client.post.resolves(makeVoidResponse());

      await teams.setMyPresence('Available', 'Available');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/presence/setPresence');
    });

    it('should include availability in POST body', async () => {
      client.post.resolves(makeVoidResponse());

      await teams.setMyPresence('Busy', 'InAMeeting');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.availability, 'Busy');
    });

    it('should include activity in POST body', async () => {
      client.post.resolves(makeVoidResponse());

      await teams.setMyPresence('Busy', 'InAMeeting');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.activity, 'InAMeeting');
    });

    it('should include expirationDuration in POST body when provided', async () => {
      client.post.resolves(makeVoidResponse());

      await teams.setMyPresence('DoNotDisturb', 'DoNotDisturb', 'PT1H');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.expirationDuration, 'PT1H');
    });

    it('should return success when presence is set', async () => {
      client.post.resolves(makeVoidResponse());

      const result = await teams.setMyPresence('Available', 'Available');

      assert.strictEqual(result.success, true);
    });

    it('should return error on failure', async () => {
      client.post.resolves(makeErrorResponse('Insufficient privileges', 'Authorization_RequestDenied'));

      const result = await teams.setMyPresence('Available', 'Available');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });
});
