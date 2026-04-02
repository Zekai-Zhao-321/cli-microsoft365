import assert from 'assert';
import sinon from 'sinon';
import auth from '../Auth.js';
import request from '../request.js';
import { telemetry } from '../telemetry.js';
import { pid } from '../utils/pid.js';
import { session } from '../utils/session.js';
import { sinonUtil } from '../utils/sinonUtil.js';
import { GraphClient } from './graph-client.js';

describe('GraphClient', () => {
  let client: GraphClient;

  before(() => {
    sinon.stub(telemetry, 'trackEvent').resolves();
    sinon.stub(pid, 'getProcessName').returns('');
    sinon.stub(session, 'getId').returns('');
  });

  beforeEach(() => {
    client = new GraphClient();
  });

  afterEach(() => {
    sinonUtil.restore([
      auth.restoreAuth,
      (auth.connection as any).active,
      request.get,
      request.post,
      request.patch,
      request.delete
    ]);
  });

  after(() => {
    sinon.restore();
  });

  describe('ensureAuth', () => {
    it('should return true when connection is active', async () => {
      sinon.stub(auth, 'restoreAuth').resolves();
      auth.connection.active = true;

      const result = await client.ensureAuth();
      assert.strictEqual(result, true);
    });

    it('should return false when connection is not active', async () => {
      sinon.stub(auth, 'restoreAuth').resolves();
      auth.connection.active = false;

      const result = await client.ensureAuth();
      assert.strictEqual(result, false);
    });

    it('should return false when restoreAuth throws', async () => {
      sinon.stub(auth, 'restoreAuth').rejects(new Error('Token expired'));
      auth.connection.active = false;

      const result = await client.ensureAuth();
      assert.strictEqual(result, false);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      sinon.stub(auth, 'restoreAuth').resolves();
      auth.connection.active = true;
    });

    it('should make GET request to correct Graph API URL', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [{ id: '1', displayName: 'Test' }] }));

      await client.get('/me/messages');

      assert(stub.calledOnce);
      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('https://graph.microsoft.com/v1.0/me/messages'));
    });

    it('should append $select query parameter from options', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      await client.get('/me/messages', { select: ['id', 'subject'] });

      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('$select=id,subject'));
    });

    it('should append $filter query parameter from options', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      await client.get('/me/messages', { filter: "isRead eq false" });

      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('$filter='));
      assert(opts.url.includes('isRead'));
    });

    it('should append $top query parameter from options', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      await client.get('/me/messages', { top: 5 });

      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('$top=5'));
    });

    it('should append $skip query parameter from options', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      await client.get('/me/messages', { skip: 10 });

      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('$skip=10'));
    });

    it('should append $orderby query parameter from options', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      await client.get('/me/messages', { orderBy: 'receivedDateTime desc' });

      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('$orderby='));
    });

    it('should append $expand query parameter from options', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      await client.get('/me/messages', { expand: 'attachments' });

      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('$expand=attachments'));
    });

    it('should combine multiple query parameters correctly', async () => {
      const stub = sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      await client.get('/me/messages', { select: ['id'], top: 5, filter: "isRead eq false" });

      const opts = stub.firstCall.args[0];
      assert(opts.url.includes('$select=id'));
      assert(opts.url.includes('$top=5'));
      assert(opts.url.includes('$filter='));
    });

    it('should strip @odata.context from response', async () => {
      sinon.stub(request, 'get').resolves(JSON.stringify({
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#messages',
        value: [{ id: '1', subject: 'Test' }]
      }));

      const result = await client.get<any[]>('/me/messages');

      assert.strictEqual(result.success, true);
      assert.strictEqual((result.data as any)['@odata.context'], undefined);
    });

    it('should strip @odata.type from response items', async () => {
      sinon.stub(request, 'get').resolves(JSON.stringify({
        value: [{ '@odata.type': '#microsoft.graph.message', id: '1', subject: 'Test' }]
      }));

      const result = await client.get<any[]>('/me/messages');

      assert.strictEqual(result.success, true);
      const items = result.data as any[];
      assert.strictEqual(items[0]['@odata.type'], undefined);
    });

    it('should strip @odata.etag from response items', async () => {
      sinon.stub(request, 'get').resolves(JSON.stringify({
        value: [{ '@odata.etag': 'W/"abc"', id: '1' }]
      }));

      const result = await client.get<any[]>('/me/messages');

      const items = result.data as any[];
      assert.strictEqual(items[0]['@odata.etag'], undefined);
    });

    it('should estimate token count of response', async () => {
      sinon.stub(request, 'get').resolves(JSON.stringify({
        value: [{ id: '1', subject: 'Test message' }]
      }));

      const result = await client.get<any[]>('/me/messages');

      assert(typeof result.tokenEstimate === 'number');
      assert(result.tokenEstimate > 0);
    });

    it('should truncate response when exceeding maxTokens', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`, subject: `Message ${i}`, body: 'A'.repeat(500)
      }));

      sinon.stub(request, 'get').resolves(JSON.stringify({ value: largeData }));

      const result = await client.get<any[]>('/me/messages', { maxTokens: 100 });

      assert.strictEqual(result.success, true);
      assert(result.tokenEstimate <= 200); // some overhead allowed
    });

    it('should set hasMore=true when response is truncated', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`, subject: `Message ${i}`, body: 'A'.repeat(500)
      }));

      sinon.stub(request, 'get').resolves(JSON.stringify({ value: largeData }));

      const result = await client.get<any[]>('/me/messages', { maxTokens: 100 });

      assert.strictEqual(result.hasMore, true);
    });

    it('should return success=false with actionable error on 401', async () => {
      const error: any = new Error('Unauthorized');
      error.response = { status: 401, data: JSON.stringify({ error: { code: 'InvalidAuthenticationToken', message: 'Access token has expired.' } }) };
      (error as any).error = { error: { code: 'InvalidAuthenticationToken', message: 'Access token has expired.' } };
      sinon.stub(request, 'get').rejects(error);

      const result = await client.get('/me/messages');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert(result.error!.message.length > 0);
    });

    it('should return suggestion "Run m365 login" on auth failure', async () => {
      const error: any = new Error('Unauthorized');
      error.response = { status: 401, data: '' };
      (error as any).error = { error: { code: 'InvalidAuthenticationToken', message: 'Access token has expired.' } };
      sinon.stub(request, 'get').rejects(error);

      const result = await client.get('/me/messages');

      assert.strictEqual(result.success, false);
      assert(result.error!.suggestion!.includes('m365 login'));
    });

    it('should return suggestion with required scope on 403', async () => {
      const error: any = new Error('Forbidden');
      error.response = { status: 403, data: '' };
      (error as any).error = { error: { code: 'Authorization_RequestDenied', message: 'Insufficient privileges to complete the operation.' } };
      sinon.stub(request, 'get').rejects(error);

      const result = await client.get('/me/messages');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'Authorization_RequestDenied');
      assert(result.error!.suggestion !== undefined);
    });

    it('should return suggestion "Verify ID" on 404', async () => {
      const error: any = new Error('Not Found');
      error.response = { status: 404, data: '' };
      (error as any).error = { error: { code: 'ErrorItemNotFound', message: 'The specified object was not found in the store.' } };
      sinon.stub(request, 'get').rejects(error);

      const result = await client.get('/me/messages/invalid-id');

      assert.strictEqual(result.success, false);
      assert(result.error!.suggestion!.toLowerCase().includes('verify'));
    });

    it('should handle 429 throttling (delegated to request.ts)', async () => {
      // 429 handling is done by request.ts internally via retry
      // This test verifies GraphClient doesn't interfere with it
      sinon.stub(request, 'get').resolves(JSON.stringify({ value: [{ id: '1' }] }));

      const result = await client.get<any[]>('/me/messages');

      assert.strictEqual(result.success, true);
    });

    it('should handle empty response gracefully', async () => {
      sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      const result = await client.get<any[]>('/me/messages');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should handle non-JSON response gracefully', async () => {
      sinon.stub(request, 'get').resolves('not json');

      const result = await client.get('/me/messages');

      // Should not throw; returns error or empty data
      assert(result !== undefined);
    });
  });

  describe('post', () => {
    beforeEach(() => {
      sinon.stub(auth, 'restoreAuth').resolves();
      auth.connection.active = true;
    });

    it('should make POST request with JSON body', async () => {
      const body = { message: { subject: 'Test', body: { content: 'Hello' }, toRecipients: [{ emailAddress: { address: 'user@test.com' } }] } };
      const stub = sinon.stub(request, 'post').resolves(JSON.stringify({}));

      await client.post('/me/sendMail', body);

      assert(stub.calledOnce);
      const opts = stub.firstCall.args[0];
      assert.deepStrictEqual(JSON.parse(opts.data), body);
    });

    it('should return parsed response data', async () => {
      const responseData = { id: 'draft-1', subject: 'Test Draft' };
      sinon.stub(request, 'post').resolves(JSON.stringify(responseData));

      const result = await client.post<typeof responseData>('/me/messages', { subject: 'Test Draft' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'draft-1');
    });

    it('should translate error on failure', async () => {
      const error: any = new Error('Bad Request');
      error.response = { status: 400, data: '' };
      (error as any).error = { error: { code: 'BadRequest', message: 'Invalid payload' } };
      sinon.stub(request, 'post').rejects(error);

      const result = await client.post('/me/sendMail', {});

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  describe('patch', () => {
    beforeEach(() => {
      sinon.stub(auth, 'restoreAuth').resolves();
      auth.connection.active = true;
    });

    it('should make PATCH request with JSON body', async () => {
      const stub = sinon.stub(request, 'patch').resolves(JSON.stringify({ id: '1', isRead: true }));

      await client.patch('/me/messages/1', { isRead: true });

      assert(stub.calledOnce);
      const opts = stub.firstCall.args[0];
      assert.deepStrictEqual(JSON.parse(opts.data), { isRead: true });
    });

    it('should return parsed response data', async () => {
      sinon.stub(request, 'patch').resolves(JSON.stringify({ id: '1', isRead: true }));

      const result = await client.patch<{ id: string; isRead: boolean }>('/me/messages/1', { isRead: true });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.isRead, true);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      sinon.stub(auth, 'restoreAuth').resolves();
      auth.connection.active = true;
    });

    it('should make DELETE request', async () => {
      const stub = sinon.stub(request, 'delete').resolves('');

      await client.delete('/me/messages/1');

      assert(stub.calledOnce);
    });

    it('should return success on 204 No Content', async () => {
      sinon.stub(request, 'delete').resolves('');

      const result = await client.delete('/me/messages/1');

      assert.strictEqual(result.success, true);
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      sinon.stub(auth, 'restoreAuth').resolves();
      auth.connection.active = true;
    });

    it('should return all items from single page', async () => {
      sinon.stub(request, 'get').resolves(JSON.stringify({
        value: [{ id: '1' }, { id: '2' }]
      }));

      const result = await client.getAll<{ id: string }>('/me/messages');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should follow @odata.nextLink for multiple pages', async () => {
      const stub = sinon.stub(request, 'get');
      stub.onFirstCall().resolves(JSON.stringify({
        value: [{ id: '1' }],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=1'
      }));
      stub.onSecondCall().resolves(JSON.stringify({
        value: [{ id: '2' }]
      }));

      const result = await client.getAll<{ id: string }>('/me/messages');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
      assert.strictEqual(stub.callCount, 2);
    });

    it('should concatenate items from all pages', async () => {
      const stub = sinon.stub(request, 'get');
      stub.onFirstCall().resolves(JSON.stringify({
        value: [{ id: '1' }, { id: '2' }],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=2'
      }));
      stub.onSecondCall().resolves(JSON.stringify({
        value: [{ id: '3' }]
      }));

      const result = await client.getAll<{ id: string }>('/me/messages');

      assert.deepStrictEqual(result.data.map(i => i.id), ['1', '2', '3']);
    });

    it('should handle empty result set', async () => {
      sinon.stub(request, 'get').resolves(JSON.stringify({ value: [] }));

      const result = await client.getAll<any>('/me/messages');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 0);
    });
  });

  describe('buildUrl', () => {
    it('should construct full URL from endpoint', () => {
      const url = (client as any).buildUrl('/me/messages');
      assert.strictEqual(url, 'https://graph.microsoft.com/v1.0/me/messages');
    });

    it('should prepend /v1.0 when endpoint starts with /', () => {
      const url = (client as any).buildUrl('/me/events');
      assert(url.startsWith('https://graph.microsoft.com/v1.0/'));
    });

    it('should not double-prepend version', () => {
      const url = (client as any).buildUrl('/me/messages');
      assert(!url.includes('v1.0/v1.0'));
    });
  });

  describe('buildQueryString', () => {
    it('should return empty string for no options', () => {
      const qs = (client as any).buildQueryString({});
      assert.strictEqual(qs, '');
    });

    it('should join select fields with comma', () => {
      const qs = (client as any).buildQueryString({ select: ['id', 'subject', 'from'] });
      assert(qs.includes('$select=id,subject,from'));
    });

    it('should URL-encode filter expressions', () => {
      const qs = (client as any).buildQueryString({ filter: "isRead eq false" });
      assert(qs.includes('$filter='));
    });
  });

  describe('translateError', () => {
    it('should parse OData error format', () => {
      const error: any = new Error('test');
      (error as any).error = { error: { code: 'ErrorItemNotFound', message: 'Item not found' } };
      error.response = { status: 404 };

      const result = (client as any).translateError(error);

      assert.strictEqual(result.code, 'ErrorItemNotFound');
      assert.strictEqual(result.message, 'Item not found');
    });

    it('should parse Graph error format', () => {
      const error: any = new Error('test');
      (error as any).error = { error: { code: 'InvalidAuthenticationToken', message: 'Access token has expired.' } };
      error.response = { status: 401 };

      const result = (client as any).translateError(error);

      assert.strictEqual(result.code, 'InvalidAuthenticationToken');
    });

    it('should provide fallback for unknown error format', () => {
      const error = new Error('Something went wrong');

      const result = (client as any).translateError(error);

      assert(result.message.length > 0);
    });

    it('should include suggestion for common error codes', () => {
      const error: any = new Error('test');
      (error as any).error = { error: { code: 'InvalidAuthenticationToken', message: 'Access token has expired.' } };
      error.response = { status: 401 };

      const result = (client as any).translateError(error);

      assert(result.suggestion !== undefined);
      assert(result.suggestion.includes('m365 login'));
    });
  });
});
