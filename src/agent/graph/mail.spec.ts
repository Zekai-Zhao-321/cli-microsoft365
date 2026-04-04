import assert from 'assert';
import sinon from 'sinon';
import { sinonUtil } from '../../utils/sinonUtil.js';
import { GraphClient } from '../graph-client.js';
import { MailOperations } from './mail.js';

describe('MailOperations', () => {
  let client: sinon.SinonStubbedInstance<GraphClient>;
  let mail: MailOperations;

  function makeResponse<T>(data: T, opts?: { tokenEstimate?: number }): { success: boolean; data: T; tokenEstimate: number } {
    return {
      success: true,
      data,
      tokenEstimate: opts?.tokenEstimate ?? 100
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

  beforeEach(() => {
    client = sinon.createStubInstance(GraphClient);
    mail = new MailOperations(client as any);
  });

  afterEach(() => {
    sinonUtil.restore([]);
    sinon.restore();
  });

  // ---------------------------------------------------------------------------
  // listInbox
  // ---------------------------------------------------------------------------
  describe('listInbox', () => {
    it('should call GET /me/messages', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listInbox();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages');
    });

    it('should pass top option when provided', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listInbox({ top: 10 });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.top, 10);
    });

    it('should pass filter option when provided', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listInbox({ filter: 'isRead eq false' });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.filter, 'isRead eq false');
    });

    it('should pass select option when provided', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listInbox({ select: ['id', 'subject', 'from'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'subject', 'from']);
    });

    it('should return messages from response', async () => {
      const messages = [
        { id: 'msg-1', subject: 'Hello' },
        { id: 'msg-2', subject: 'World' }
      ];
      client.get.resolves(makeResponse(messages));

      const result = await mail.listInbox();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Unauthorized', 'InvalidAuthenticationToken'));

      const result = await mail.listInbox();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getMessage
  // ---------------------------------------------------------------------------
  describe('getMessage', () => {
    it('should call GET /me/messages/{id}', async () => {
      client.get.resolves(makeResponse({ id: 'msg-1', subject: 'Test' }));

      await mail.getMessage('msg-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1');
    });

    it('should return the message data', async () => {
      const message = { id: 'msg-1', subject: 'Test', isRead: false };
      client.get.resolves(makeResponse(message));

      const result = await mail.getMessage('msg-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'msg-1');
    });

    it('should propagate not-found error', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await mail.getMessage('nonexistent-id');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // getUnreadCount
  // ---------------------------------------------------------------------------
  describe('getUnreadCount', () => {
    it('should call GET /me/mailFolders/inbox', async () => {
      client.get.resolves(makeResponse({ unreadItemCount: 5 }));

      await mail.getUnreadCount();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders/inbox');
    });

    it('should return the unreadItemCount from folder response', async () => {
      client.get.resolves(makeResponse({ id: 'inbox', displayName: 'Inbox', unreadItemCount: 7 }));

      const result = await mail.getUnreadCount();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 7);
    });

    it('should return 0 when unreadItemCount is 0', async () => {
      client.get.resolves(makeResponse({ id: 'inbox', unreadItemCount: 0 }));

      const result = await mail.getUnreadCount();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 0);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Forbidden', 'Authorization_RequestDenied'));

      const result = await mail.getUnreadCount();

      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // sendMail
  // ---------------------------------------------------------------------------
  describe('sendMail', () => {
    it('should call POST /me/sendMail', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['user@test.com'], subject: 'Hello', body: 'World' });

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/sendMail');
    });

    it('should include recipients in the request body', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['a@test.com', 'b@test.com'], subject: 'Hi', body: 'Body text' });

      const [, body] = client.post.firstCall.args;
      const recipients = body.message.toRecipients;
      assert(Array.isArray(recipients));
      assert.strictEqual(recipients.length, 2);
    });

    it('should include subject and body content in request body', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['user@test.com'], subject: 'Test Subject', body: 'Test Body' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.message.subject, 'Test Subject');
      assert.strictEqual(body.message.body.content, 'Test Body');
    });

    it('should default body type to Text when not specified', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['user@test.com'], subject: 'S', body: 'B' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.message.body.contentType, 'Text');
    });

    it('should use HTML body type when specified', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['user@test.com'], subject: 'S', body: '<p>Hello</p>', bodyType: 'HTML' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.message.body.contentType, 'HTML');
    });

    it('should include cc recipients when provided', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['a@test.com'], subject: 'S', body: 'B', cc: ['cc@test.com'] });

      const [, body] = client.post.firstCall.args;
      assert(Array.isArray(body.message.ccRecipients));
      assert.strictEqual(body.message.ccRecipients.length, 1);
    });

    it('should include bcc recipients when provided', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['a@test.com'], subject: 'S', body: 'B', bcc: ['bcc@test.com'] });

      const [, body] = client.post.firstCall.args;
      assert(Array.isArray(body.message.bccRecipients));
      assert.strictEqual(body.message.bccRecipients.length, 1);
    });

    it('should include importance when provided', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['a@test.com'], subject: 'S', body: 'B', importance: 'high' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.message.importance, 'high');
    });

    it('should include attachments when provided', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({
        to: ['a@test.com'],
        subject: 'S',
        body: 'B',
        attachments: [{ name: 'file.txt', contentBytes: 'aGVsbG8=' }]
      });

      const [, body] = client.post.firstCall.args;
      assert(Array.isArray(body.message.attachments));
      assert.strictEqual(body.message.attachments.length, 1);
      assert.strictEqual(body.message.attachments[0].name, 'file.txt');
    });

    it('should set saveToSentItems when provided', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['a@test.com'], subject: 'S', body: 'B', saveToSentItems: false });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.saveToSentItems, false);
    });

    it('should propagate error on failure', async () => {
      client.post.resolves(makeErrorResponse('BadRequest', 'BadRequest'));

      const result = await mail.sendMail({ to: ['bad'], subject: 'S', body: 'B' });

      assert.strictEqual(result.success, false);
    });

    it('should still make the request when to array is empty', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: [], subject: 'S', body: 'B' });

      assert(client.post.calledOnce);
      const [endpoint, body] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/sendMail');
      assert.deepStrictEqual(body.message.toRecipients, []);
    });

    it('should still send when subject is an empty string', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.sendMail({ to: ['user@test.com'], subject: '', body: 'B' });

      assert(client.post.calledOnce);
      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.message.subject, '');
    });
  });

  // ---------------------------------------------------------------------------
  // createDraft
  // ---------------------------------------------------------------------------
  describe('createDraft', () => {
    it('should call POST /me/messages', async () => {
      client.post.resolves(makeResponse({ id: 'draft-1', subject: 'Draft' }));

      await mail.createDraft({ to: ['user@test.com'], subject: 'Draft Subject', body: 'Draft Body' });

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages');
    });

    it('should include subject and body in request body', async () => {
      client.post.resolves(makeResponse({ id: 'draft-1' }));

      await mail.createDraft({ to: ['user@test.com'], subject: 'My Draft', body: 'Draft content' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.subject, 'My Draft');
      assert.strictEqual(body.body.content, 'Draft content');
    });

    it('should return the created draft message', async () => {
      const draft = { id: 'draft-1', subject: 'My Draft', isDraft: true };
      client.post.resolves(makeResponse(draft));

      const result = await mail.createDraft({ to: ['user@test.com'], subject: 'My Draft', body: 'B' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'draft-1');
    });
  });

  // ---------------------------------------------------------------------------
  // replyToMessage
  // ---------------------------------------------------------------------------
  describe('replyToMessage', () => {
    it('should call POST /me/messages/{id}/reply', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.replyToMessage('msg-1', 'Thanks!');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1/reply');
    });

    it('should include comment in request body', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.replyToMessage('msg-1', 'Got it, thanks!');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.comment, 'Got it, thanks!');
    });

    it('should return success response', async () => {
      client.post.resolves(makeResponse(undefined));

      const result = await mail.replyToMessage('msg-1', 'Reply text');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // replyAllToMessage
  // ---------------------------------------------------------------------------
  describe('replyAllToMessage', () => {
    it('should call POST /me/messages/{id}/replyAll', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.replyAllToMessage('msg-1', 'Reply all comment');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1/replyAll');
    });

    it('should include comment in request body', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.replyAllToMessage('msg-2', 'Noted');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.comment, 'Noted');
    });
  });

  // ---------------------------------------------------------------------------
  // forwardMessage
  // ---------------------------------------------------------------------------
  describe('forwardMessage', () => {
    it('should call POST /me/messages/{id}/forward', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.forwardMessage('msg-1', ['fwd@test.com']);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1/forward');
    });

    it('should include toRecipients in request body', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.forwardMessage('msg-1', ['a@test.com', 'b@test.com']);

      const [, body] = client.post.firstCall.args;
      assert(Array.isArray(body.toRecipients));
      assert.strictEqual(body.toRecipients.length, 2);
    });

    it('should include optional comment when provided', async () => {
      client.post.resolves(makeResponse(undefined));

      await mail.forwardMessage('msg-1', ['fwd@test.com'], 'FYI');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.comment, 'FYI');
    });

    it('should work without a comment', async () => {
      client.post.resolves(makeResponse(undefined));

      const result = await mail.forwardMessage('msg-1', ['fwd@test.com']);

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // moveMessage
  // ---------------------------------------------------------------------------
  describe('moveMessage', () => {
    it('should call POST /me/messages/{id}/move', async () => {
      client.post.resolves(makeResponse({ id: 'msg-1', parentFolderId: 'archive' }));

      await mail.moveMessage('msg-1', 'archive');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1/move');
    });

    it('should include destinationId in request body', async () => {
      client.post.resolves(makeResponse({ id: 'msg-1' }));

      await mail.moveMessage('msg-1', 'deleteditems');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.destinationId, 'deleteditems');
    });

    it('should return the moved message', async () => {
      const movedMsg = { id: 'msg-1', parentFolderId: 'archive' };
      client.post.resolves(makeResponse(movedMsg));

      const result = await mail.moveMessage('msg-1', 'archive');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'msg-1');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteMessage
  // ---------------------------------------------------------------------------
  describe('deleteMessage', () => {
    it('should call DELETE /me/messages/{id}', async () => {
      client.delete.resolves(makeResponse(undefined));

      await mail.deleteMessage('msg-1');

      assert(client.delete.calledOnce);
      const [endpoint] = client.delete.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1');
    });

    it('should return success on deletion', async () => {
      client.delete.resolves(makeResponse(undefined));

      const result = await mail.deleteMessage('msg-1');

      assert.strictEqual(result.success, true);
    });

    it('should propagate error when message not found', async () => {
      client.delete.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await mail.deleteMessage('nonexistent');

      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // markAsRead
  // ---------------------------------------------------------------------------
  describe('markAsRead', () => {
    it('should call PATCH /me/messages/{id} with isRead true', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1', isRead: true }));

      await mail.markAsRead('msg-1');

      assert(client.patch.calledOnce);
      const [endpoint, body] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1');
      assert.strictEqual(body.isRead, true);
    });

    it('should return success response', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1', isRead: true }));

      const result = await mail.markAsRead('msg-1');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // markAsUnread
  // ---------------------------------------------------------------------------
  describe('markAsUnread', () => {
    it('should call PATCH /me/messages/{id} with isRead false', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1', isRead: false }));

      await mail.markAsUnread('msg-1');

      assert(client.patch.calledOnce);
      const [endpoint, body] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1');
      assert.strictEqual(body.isRead, false);
    });

    it('should return success response', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1', isRead: false }));

      const result = await mail.markAsUnread('msg-1');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // flagMessage
  // ---------------------------------------------------------------------------
  describe('flagMessage', () => {
    it('should call PATCH /me/messages/{id} with flag status flagged', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1' }));

      await mail.flagMessage('msg-1');

      assert(client.patch.calledOnce);
      const [endpoint, body] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1');
      assert(body.flag !== undefined);
      assert.strictEqual(body.flag.flagStatus, 'flagged');
    });

    it('should return success response', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1' }));

      const result = await mail.flagMessage('msg-1');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // unflagMessage
  // ---------------------------------------------------------------------------
  describe('unflagMessage', () => {
    it('should call PATCH /me/messages/{id} with flag status notFlagged', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1' }));

      await mail.unflagMessage('msg-1');

      assert(client.patch.calledOnce);
      const [endpoint, body] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1');
      assert(body.flag !== undefined);
      assert.strictEqual(body.flag.flagStatus, 'notFlagged');
    });

    it('should return success response', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1' }));

      const result = await mail.unflagMessage('msg-1');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // categorizeMessage
  // ---------------------------------------------------------------------------
  describe('categorizeMessage', () => {
    it('should call PATCH /me/messages/{id} with categories', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1' }));

      await mail.categorizeMessage('msg-1', ['Red Category', 'Blue Category']);

      assert(client.patch.calledOnce);
      const [endpoint, body] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1');
      assert.deepStrictEqual(body.categories, ['Red Category', 'Blue Category']);
    });

    it('should return success response', async () => {
      client.patch.resolves(makeResponse({ id: 'msg-1' }));

      const result = await mail.categorizeMessage('msg-1', ['Work']);

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // searchMail
  // ---------------------------------------------------------------------------
  describe('searchMail', () => {
    it('should call POST /search/query with entityTypes message', async () => {
      client.post.resolves(makeResponse({
        value: [{ hitsContainers: [{ hits: [], total: 0, moreResultsAvailable: false }] }]
      }));

      await mail.searchMail('project alpha');

      assert(client.post.calledOnce);
      const [endpoint, body] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/search/query');
      assert.deepStrictEqual(body.requests[0].entityTypes, ['message']);
    });

    it('should include the query string in request body', async () => {
      client.post.resolves(makeResponse({
        value: [{ hitsContainers: [{ hits: [], total: 0, moreResultsAvailable: false }] }]
      }));

      await mail.searchMail('budget report');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests[0].query.queryString, 'budget report');
    });

    it('should pass top option as size when provided', async () => {
      client.post.resolves(makeResponse({
        value: [{ hitsContainers: [{ hits: [], total: 0, moreResultsAvailable: false }] }]
      }));

      await mail.searchMail('test', { top: 5 });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests[0].size, 5);
    });

    it('should return messages from search results', async () => {
      const hits = [
        { hitId: 'msg-1', resource: { id: 'msg-1', subject: 'Budget Q1' } },
        { hitId: 'msg-2', resource: { id: 'msg-2', subject: 'Budget Q2' } }
      ];
      client.post.resolves(makeResponse({
        value: [{ hitsContainers: [{ hits, total: 2, moreResultsAvailable: false }] }]
      }));

      const result = await mail.searchMail('budget');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should return empty array when no results', async () => {
      client.post.resolves(makeResponse({
        value: [{ hitsContainers: [{ hits: [], total: 0, moreResultsAvailable: false }] }]
      }));

      const result = await mail.searchMail('xyzzy-nonexistent');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should propagate error response', async () => {
      client.post.resolves(makeErrorResponse('Search failed', 'ServiceUnavailable'));

      const result = await mail.searchMail('test');

      assert.strictEqual(result.success, false);
    });

    it('should still make the request when query is empty string', async () => {
      client.post.resolves(makeResponse({
        value: [{ hitsContainers: [{ hits: [], total: 0, moreResultsAvailable: false }] }]
      }));

      await mail.searchMail('');

      assert(client.post.calledOnce);
      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests[0].query.queryString, '');
    });
  });

  // ---------------------------------------------------------------------------
  // listFolders
  // ---------------------------------------------------------------------------
  describe('listFolders', () => {
    it('should call GET /me/mailFolders', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listFolders();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders');
    });

    it('should return list of mail folders', async () => {
      const folders = [
        { id: 'inbox', displayName: 'Inbox' },
        { id: 'sentitems', displayName: 'Sent Items' }
      ];
      client.get.resolves(makeResponse(folders));

      const result = await mail.listFolders();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // createFolder
  // ---------------------------------------------------------------------------
  describe('createFolder', () => {
    it('should call POST /me/mailFolders when no parent specified', async () => {
      client.post.resolves(makeResponse({ id: 'folder-1', displayName: 'Archive' }));

      await mail.createFolder('Archive');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders');
    });

    it('should call POST /me/mailFolders/{parentId}/childFolders when parent specified', async () => {
      client.post.resolves(makeResponse({ id: 'subfolder-1', displayName: 'Sub' }));

      await mail.createFolder('Sub', 'parent-folder-id');

      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders/parent-folder-id/childFolders');
    });

    it('should include displayName in request body', async () => {
      client.post.resolves(makeResponse({ id: 'folder-1', displayName: 'Archive' }));

      await mail.createFolder('Archive');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.displayName, 'Archive');
    });

    it('should return the created folder', async () => {
      const folder = { id: 'folder-1', displayName: 'Archive' };
      client.post.resolves(makeResponse(folder));

      const result = await mail.createFolder('Archive');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'folder-1');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteFolder
  // ---------------------------------------------------------------------------
  describe('deleteFolder', () => {
    it('should call DELETE /me/mailFolders/{id}', async () => {
      client.delete.resolves(makeResponse(undefined));

      await mail.deleteFolder('folder-1');

      assert(client.delete.calledOnce);
      const [endpoint] = client.delete.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders/folder-1');
    });

    it('should return success on deletion', async () => {
      client.delete.resolves(makeResponse(undefined));

      const result = await mail.deleteFolder('folder-1');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // listAttachments
  // ---------------------------------------------------------------------------
  describe('listAttachments', () => {
    it('should call GET /me/messages/{messageId}/attachments', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listAttachments('msg-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1/attachments');
    });

    it('should return list of attachments', async () => {
      const attachments = [
        { id: 'att-1', name: 'file.pdf', contentType: 'application/pdf' }
      ];
      client.get.resolves(makeResponse(attachments));

      const result = await mail.listAttachments('msg-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getAttachment
  // ---------------------------------------------------------------------------
  describe('getAttachment', () => {
    it('should call GET /me/messages/{messageId}/attachments/{attachmentId}', async () => {
      client.get.resolves(makeResponse({ id: 'att-1', name: 'file.pdf' }));

      await mail.getAttachment('msg-1', 'att-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1/attachments/att-1');
    });

    it('should return the attachment data', async () => {
      const attachment = { id: 'att-1', name: 'report.docx', contentBytes: 'base64data' };
      client.get.resolves(makeResponse(attachment));

      const result = await mail.getAttachment('msg-1', 'att-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'att-1');
    });

    it('should propagate not-found error when attachment does not exist', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await mail.getAttachment('msg-1', 'nonexistent-att');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // addAttachment
  // ---------------------------------------------------------------------------
  describe('addAttachment', () => {
    it('should call POST /me/messages/{messageId}/attachments', async () => {
      client.post.resolves(makeResponse({ id: 'att-1', name: 'file.txt' }));

      await mail.addAttachment('msg-1', { name: 'file.txt', contentBytes: 'aGVsbG8=' });

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/messages/msg-1/attachments');
    });

    it('should include attachment data in request body', async () => {
      client.post.resolves(makeResponse({ id: 'att-1', name: 'file.txt' }));

      await mail.addAttachment('msg-1', { name: 'file.txt', contentBytes: 'aGVsbG8=' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.name, 'file.txt');
      assert.strictEqual(body.contentBytes, 'aGVsbG8=');
    });

    it('should return the created attachment', async () => {
      const attachment = { id: 'att-1', name: 'file.txt', contentType: 'text/plain' };
      client.post.resolves(makeResponse(attachment));

      const result = await mail.addAttachment('msg-1', { name: 'file.txt', contentBytes: 'aGVsbG8=' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'att-1');
    });

    it('should propagate error when attachment upload fails', async () => {
      client.post.resolves(makeErrorResponse('Maximum attachment size exceeded', 'ErrorAttachmentSizeShouldNotBeLargerThanAllowedLimit'));

      const result = await mail.addAttachment('msg-1', { name: 'huge.bin', contentBytes: 'AAAA' });

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // bulkMove
  // ---------------------------------------------------------------------------
  describe('bulkMove', () => {
    it('should call POST /$batch', async () => {
      client.post.resolves(makeResponse({ responses: [] }));

      await mail.bulkMove(['msg-1', 'msg-2'], 'archive');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/$batch');
    });

    it('should create one batch request per message', async () => {
      client.post.resolves(makeResponse({
        responses: [
          { id: '0', status: 201 },
          { id: '1', status: 201 }
        ]
      }));

      await mail.bulkMove(['msg-1', 'msg-2'], 'archive');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests.length, 2);
    });

    it('should include destinationId in each batch request body', async () => {
      client.post.resolves(makeResponse({
        responses: [{ id: '0', status: 201 }]
      }));

      await mail.bulkMove(['msg-1'], 'deleteditems');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests[0].body.destinationId, 'deleteditems');
    });

    it('should return count of moved messages', async () => {
      client.post.resolves(makeResponse({
        responses: [
          { id: '0', status: 201 },
          { id: '1', status: 201 },
          { id: '2', status: 201 }
        ]
      }));

      const result = await mail.bulkMove(['msg-1', 'msg-2', 'msg-3'], 'archive');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.moved, 3);
    });

    it('should propagate error when batch request fails', async () => {
      client.post.resolves(makeErrorResponse('Bad request', 'BadRequest'));

      const result = await mail.bulkMove(['msg-1', 'msg-2'], 'archive');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });

    it('should use responses length for moved count when responses present', async () => {
      client.post.resolves(makeResponse({
        responses: [
          { id: '0', status: 201 },
          { id: '1', status: 201 },
          { id: '2', status: 201 },
          { id: '3', status: 201 },
          { id: '4', status: 201 }
        ]
      }));

      const result = await mail.bulkMove(['m1', 'm2', 'm3', 'm4', 'm5'], 'inbox');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.moved, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // bulkMarkRead
  // ---------------------------------------------------------------------------
  describe('bulkMarkRead', () => {
    it('should call POST /$batch', async () => {
      client.post.resolves(makeResponse({ responses: [] }));

      await mail.bulkMarkRead(['msg-1', 'msg-2']);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/$batch');
    });

    it('should create PATCH requests with isRead true for each message', async () => {
      client.post.resolves(makeResponse({
        responses: [{ id: '0', status: 200 }]
      }));

      await mail.bulkMarkRead(['msg-1']);

      const [, body] = client.post.firstCall.args;
      const req = body.requests[0];
      assert.strictEqual(req.method, 'PATCH');
      assert.strictEqual(req.body.isRead, true);
    });

    it('should return count of updated messages', async () => {
      client.post.resolves(makeResponse({
        responses: [
          { id: '0', status: 200 },
          { id: '1', status: 200 }
        ]
      }));

      const result = await mail.bulkMarkRead(['msg-1', 'msg-2']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.updated, 2);
    });

    it('should propagate error when batch fails', async () => {
      client.post.resolves(makeErrorResponse('Unauthorized', 'InvalidAuthenticationToken'));

      const result = await mail.bulkMarkRead(['msg-1']);

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // bulkDelete
  // ---------------------------------------------------------------------------
  describe('bulkDelete', () => {
    it('should call POST /$batch', async () => {
      client.post.resolves(makeResponse({ responses: [] }));

      await mail.bulkDelete(['msg-1', 'msg-2']);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/$batch');
    });

    it('should create DELETE requests for each message', async () => {
      client.post.resolves(makeResponse({
        responses: [{ id: '0', status: 204 }]
      }));

      await mail.bulkDelete(['msg-1']);

      const [, body] = client.post.firstCall.args;
      const req = body.requests[0];
      assert.strictEqual(req.method, 'DELETE');
    });

    it('should include message id in each request URL', async () => {
      client.post.resolves(makeResponse({
        responses: [{ id: '0', status: 204 }]
      }));

      await mail.bulkDelete(['msg-abc']);

      const [, body] = client.post.firstCall.args;
      const req = body.requests[0];
      assert(req.url.includes('msg-abc'));
    });

    it('should return count of deleted messages', async () => {
      client.post.resolves(makeResponse({
        responses: [
          { id: '0', status: 204 },
          { id: '1', status: 204 }
        ]
      }));

      const result = await mail.bulkDelete(['msg-1', 'msg-2']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.deleted, 2);
    });

    it('should propagate error when batch delete fails', async () => {
      client.post.resolves(makeErrorResponse('Forbidden', 'AccessDenied'));

      const result = await mail.bulkDelete(['msg-1']);

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listRules
  // ---------------------------------------------------------------------------
  describe('listRules', () => {
    it('should call GET /me/mailFolders/inbox/messageRules', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listRules();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders/inbox/messageRules');
    });

    it('should return list of rules', async () => {
      const rules = [
        { id: 'rule-1', displayName: 'Move newsletters' },
        { id: 'rule-2', displayName: 'Flag from boss' }
      ];
      client.get.resolves(makeResponse(rules));

      const result = await mail.listRules();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should return empty array when no rules exist', async () => {
      client.get.resolves(makeResponse([]));

      const result = await mail.listRules();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // createRule
  // ---------------------------------------------------------------------------
  describe('createRule', () => {
    it('should call POST /me/mailFolders/inbox/messageRules', async () => {
      client.post.resolves(makeResponse({ id: 'rule-1', displayName: 'Test Rule' }));

      await mail.createRule({
        displayName: 'Test Rule',
        conditions: { senderContains: ['newsletter'] },
        actions: { moveToFolder: 'inbox' }
      });

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders/inbox/messageRules');
    });

    it('should include displayName, conditions and actions in request body', async () => {
      const conditions = { senderContains: ['newsletter@example.com'] };
      const actions = { moveToFolder: 'newsletters-folder-id' };
      client.post.resolves(makeResponse({ id: 'rule-1' }));

      await mail.createRule({ displayName: 'Newsletter Rule', conditions, actions });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.displayName, 'Newsletter Rule');
      assert.deepStrictEqual(body.conditions, conditions);
      assert.deepStrictEqual(body.actions, actions);
    });

    it('should return the created rule', async () => {
      const rule = { id: 'rule-1', displayName: 'My Rule' };
      client.post.resolves(makeResponse(rule));

      const result = await mail.createRule({ displayName: 'My Rule', conditions: {}, actions: {} });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'rule-1');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteRule
  // ---------------------------------------------------------------------------
  describe('deleteRule', () => {
    it('should call DELETE /me/mailFolders/inbox/messageRules/{id}', async () => {
      client.delete.resolves(makeResponse(undefined));

      await mail.deleteRule('rule-1');

      assert(client.delete.calledOnce);
      const [endpoint] = client.delete.firstCall.args;
      assert.strictEqual(endpoint, '/me/mailFolders/inbox/messageRules/rule-1');
    });

    it('should return success on deletion', async () => {
      client.delete.resolves(makeResponse(undefined));

      const result = await mail.deleteRule('rule-1');

      assert.strictEqual(result.success, true);
    });

    it('should propagate not-found error when rule does not exist', async () => {
      client.delete.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await mail.deleteRule('nonexistent-rule');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // listCategories
  // ---------------------------------------------------------------------------
  describe('listCategories', () => {
    it('should call GET /me/outlook/masterCategories', async () => {
      client.get.resolves(makeResponse([]));

      await mail.listCategories();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/outlook/masterCategories');
    });

    it('should return list of categories', async () => {
      const categories = [
        { id: 'cat-1', displayName: 'Red Category', color: 'preset0' },
        { id: 'cat-2', displayName: 'Blue Category', color: 'preset1' }
      ];
      client.get.resolves(makeResponse(categories));

      const result = await mail.listCategories();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should return empty array when no categories exist', async () => {
      client.get.resolves(makeResponse([]));

      const result = await mail.listCategories();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // createCategory
  // ---------------------------------------------------------------------------
  describe('createCategory', () => {
    it('should call POST /me/outlook/masterCategories', async () => {
      client.post.resolves(makeResponse({ id: 'cat-1', displayName: 'Work', color: 'preset2' }));

      await mail.createCategory('Work', 'preset2');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/outlook/masterCategories');
    });

    it('should include displayName and color in request body', async () => {
      client.post.resolves(makeResponse({ id: 'cat-1' }));

      await mail.createCategory('Personal', 'preset5');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.displayName, 'Personal');
      assert.strictEqual(body.color, 'preset5');
    });

    it('should return the created category', async () => {
      const category = { id: 'cat-1', displayName: 'Work', color: 'preset2' };
      client.post.resolves(makeResponse(category));

      const result = await mail.createCategory('Work', 'preset2');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'cat-1');
      assert.strictEqual(result.data.displayName, 'Work');
    });
  });
});
