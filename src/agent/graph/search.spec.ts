import assert from 'assert';
import sinon from 'sinon';
import { sinonUtil } from '../../utils/sinonUtil.js';
import { GraphClient } from '../graph-client.js';
import { SearchOperations, SearchEntityType } from './search.js';

describe('SearchOperations', () => {
  let client: sinon.SinonStubbedInstance<GraphClient>;
  let search: SearchOperations;

  const ALL_ENTITY_TYPES: SearchEntityType[] = ['message', 'event', 'driveItem', 'site', 'list', 'listItem'];

  function makeSearchResponse(hits: any[] = []): { success: boolean; data: any; tokenEstimate: number } {
    return {
      success: true,
      data: {
        value: [
          {
            hitsContainers: [
              {
                hits,
                total: hits.length,
                moreResultsAvailable: false
              }
            ]
          }
        ]
      },
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

  beforeEach(() => {
    client = sinon.createStubInstance(GraphClient);
    search = new SearchOperations(client as any);
  });

  afterEach(() => {
    sinonUtil.restore([]);
    sinon.restore();
  });

  describe('searchAll', () => {
    it('should post to /search/query with query string', async () => {
      client.post.resolves(makeSearchResponse([{ hitId: '1', resource: { subject: 'Hello' } }]));

      await search.searchAll('Hello');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/search/query');
    });

    it('should default to all entity types when not specified', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('test');

      const [, body] = client.post.firstCall.args;
      const request = body.requests[0];
      assert.deepStrictEqual(request.entityTypes.sort(), ALL_ENTITY_TYPES.sort());
    });

    it('should pass specified entity types in request body', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('meeting notes', { entityTypes: ['event', 'driveItem'] });

      const [, body] = client.post.firstCall.args;
      const request = body.requests[0];
      assert.deepStrictEqual(request.entityTypes.sort(), ['driveItem', 'event']);
    });

    it('should pass top as size parameter in request body', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('test', { top: 10 });

      const [, body] = client.post.firstCall.args;
      const request = body.requests[0];
      assert.strictEqual(request.size, 10);
    });

    it('should set from to 0 in request body', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('test');

      const [, body] = client.post.firstCall.args;
      const request = body.requests[0];
      assert.strictEqual(request.from, 0);
    });

    it('should return empty results for no matches', async () => {
      client.post.resolves(makeSearchResponse([]));

      const result = await search.searchAll('xyzzy-nonexistent');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should handle Graph API error gracefully', async () => {
      client.post.resolves(makeErrorResponse('Search service unavailable', 'ServiceUnavailable'));

      const result = await search.searchAll('test');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert(result.error!.message.length > 0);
    });

    it('should include queryString in request body', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('project alpha');

      const [, body] = client.post.firstCall.args;
      const request = body.requests[0];
      assert.strictEqual(request.query.queryString, 'project alpha');
    });

    it('should default size to 25 when top is not specified', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('test');

      const [, body] = client.post.firstCall.args;
      const request = body.requests[0];
      assert.strictEqual(request.size, 25);
    });

    it('should search with a single entity type when provided', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('project', { entityTypes: ['event'] });

      const [, body] = client.post.firstCall.args;
      const request = body.requests[0];
      assert.deepStrictEqual(request.entityTypes, ['event']);
    });

    it('should still make the request when query is an empty string', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchAll('');

      assert(client.post.calledOnce);
      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests[0].query.queryString, '');
    });

    it('should return error data array and error info on failure', async () => {
      client.post.resolves(makeErrorResponse('Search failed', 'ServiceUnavailable'));

      const result = await search.searchAll('test');

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(result.data, []);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'ServiceUnavailable');
    });
  });

  describe('searchByEntityType', () => {
    it('should search with single entity type in request body', async () => {
      client.post.resolves(makeSearchResponse([{ hitId: 'msg-1', resource: { subject: 'Re: Meeting' } }]));

      await search.searchByEntityType('meeting', 'message');

      const [endpoint, body] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/search/query');
      const req = body.requests[0];
      assert.deepStrictEqual(req.entityTypes, ['message']);
    });

    it('should search only driveItem entities', async () => {
      client.post.resolves(makeSearchResponse([{ hitId: 'file-1', resource: { name: 'report.docx' } }]));

      await search.searchByEntityType('report', 'driveItem');

      const [, body] = client.post.firstCall.args;
      const req = body.requests[0];
      assert.deepStrictEqual(req.entityTypes, ['driveItem']);
    });

    it('should pass top parameter as size in request body', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchByEntityType('test', 'event', { top: 5 });

      const [, body] = client.post.firstCall.args;
      const req = body.requests[0];
      assert.strictEqual(req.size, 5);
    });

    it('should return extracted hits from response', async () => {
      const hits = [
        { hitId: 'msg-1', resource: { subject: 'Hello' } },
        { hitId: 'msg-2', resource: { subject: 'World' } }
      ];
      client.post.resolves(makeSearchResponse(hits));

      const result = await search.searchByEntityType('hello', 'message');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should still make the request even with an unusual entity type value', async () => {
      client.post.resolves(makeSearchResponse([]));

      // Cast to bypass TypeScript — Graph API itself will validate
      await search.searchByEntityType('test', 'site' as any);

      assert(client.post.calledOnce);
      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.requests[0].entityTypes, ['site']);
    });

    it('should propagate error when searchByEntityType fails', async () => {
      client.post.resolves(makeErrorResponse('Search unavailable', 'ServiceUnavailable'));

      const result = await search.searchByEntityType('query', 'message');

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(result.data, []);
      assert(result.error !== undefined);
    });
  });

  describe('searchWithFilters', () => {
    it('should apply date range filter using KQL syntax', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchWithFilters('report', {
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      });

      const [, body] = client.post.firstCall.args;
      const queryString: string = body.requests[0].query.queryString;
      assert(queryString.includes('2024-01-01'), `Expected start date in query: ${queryString}`);
      assert(queryString.includes('2024-01-31'), `Expected end date in query: ${queryString}`);
    });

    it('should apply from filter using KQL syntax', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchWithFilters('hello', {
        from: 'user@test.com'
      });

      const [, body] = client.post.firstCall.args;
      const queryString: string = body.requests[0].query.queryString;
      assert(queryString.includes('user@test.com'), `Expected from address in query: ${queryString}`);
    });

    it('should combine original query string with filters', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchWithFilters('budget', {
        from: 'boss@company.com'
      });

      const [, body] = client.post.firstCall.args;
      const queryString: string = body.requests[0].query.queryString;
      assert(queryString.includes('budget'), `Expected original query in queryString: ${queryString}`);
      assert(queryString.includes('boss@company.com'), `Expected from filter in queryString: ${queryString}`);
    });

    it('should handle empty results when filters exclude all matches', async () => {
      client.post.resolves(makeSearchResponse([]));

      const result = await search.searchWithFilters('test', {
        dateRange: { start: '1900-01-01', end: '1900-01-02' }
      });

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should pass entity types option in request body', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchWithFilters('report', {}, { entityTypes: ['driveItem'] });

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.requests[0].entityTypes, ['driveItem']);
    });

    it('should pass top option as size in request body', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchWithFilters('test', {}, { top: 15 });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests[0].size, 15);
    });

    it('should build KQL query with only dateRange filter', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchWithFilters('invoice', { dateRange: { start: '2025-01-01', end: '2025-03-31' } });

      const [, body] = client.post.firstCall.args;
      const queryString: string = body.requests[0].query.queryString;
      assert(queryString.startsWith('invoice'), `Expected original query at start: ${queryString}`);
      assert(queryString.includes('received>='), `Expected received>= KQL syntax: ${queryString}`);
      assert(queryString.includes('received<='), `Expected received<= KQL syntax: ${queryString}`);
      assert(queryString.includes('2025-01-01'), `Expected start date: ${queryString}`);
      assert(queryString.includes('2025-03-31'), `Expected end date: ${queryString}`);
    });

    it('should build KQL query with only from filter', async () => {
      client.post.resolves(makeSearchResponse([]));

      await search.searchWithFilters('hello', { from: 'boss@company.com' });

      const [, body] = client.post.firstCall.args;
      const queryString: string = body.requests[0].query.queryString;
      assert(queryString.includes('from:boss@company.com'), `Expected from: KQL syntax: ${queryString}`);
      assert(!queryString.includes('received'), `Did not expect date filter: ${queryString}`);
    });

    it('should pass through special characters in query string without modification', async () => {
      client.post.resolves(makeSearchResponse([]));

      const specialQuery = 'subject:"Q1 Report (2025)" AND from:cfo@org.com';
      await search.searchWithFilters(specialQuery, {});

      const [, body] = client.post.firstCall.args;
      const queryString: string = body.requests[0].query.queryString;
      assert(queryString.startsWith(specialQuery), `Expected special chars preserved: ${queryString}`);
    });

    it('should propagate error when searchWithFilters API call fails', async () => {
      client.post.resolves(makeErrorResponse('Quota exceeded', 'QuotaReached'));

      const result = await search.searchWithFilters('test', { from: 'a@b.com' });

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(result.data, []);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'QuotaReached');
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return query alteration suggestions from response', async () => {
      client.post.resolves({
        success: true,
        data: {
          value: [
            {
              searchTerms: ['metting'],
              hitsContainers: [],
              queryAlterationResponse: {
                originalQueryString: 'metting',
                queryAlteration: {
                  alteredQueryString: 'meeting',
                  alteredHighlightedQueryString: '<em>meeting</em>',
                  alterationType: 'Suggestion'
                }
              }
            }
          ]
        },
        tokenEstimate: 50
      });

      const result = await search.getSearchSuggestions('metting');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert(result.data.length > 0);
    });

    it('should return empty suggestions when query is already optimal', async () => {
      client.post.resolves({
        success: true,
        data: {
          value: [
            {
              searchTerms: ['meeting'],
              hitsContainers: [],
              queryAlterationResponse: null
            }
          ]
        },
        tokenEstimate: 30
      });

      const result = await search.getSearchSuggestions('meeting');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should pass entity types when provided', async () => {
      client.post.resolves({
        success: true,
        data: {
          value: [
            {
              searchTerms: ['calender'],
              hitsContainers: [],
              queryAlterationResponse: {
                originalQueryString: 'calender',
                queryAlteration: {
                  alteredQueryString: 'calendar',
                  alteredHighlightedQueryString: '<em>calendar</em>',
                  alterationType: 'Suggestion'
                }
              }
            }
          ]
        },
        tokenEstimate: 50
      });

      await search.getSearchSuggestions('calender', ['event']);

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.requests[0].entityTypes, ['event']);
    });

    it('should still make the request when query is an empty string', async () => {
      client.post.resolves({
        success: true,
        data: { value: [] },
        tokenEstimate: 10
      });

      await search.getSearchSuggestions('');

      assert(client.post.calledOnce);
      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.requests[0].query.queryString, '');
    });

    it('should propagate error when getSearchSuggestions API call fails', async () => {
      client.post.resolves(makeErrorResponse('Internal server error', 'InternalServerError'));

      const result = await search.getSearchSuggestions('test');

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(result.data, []);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'InternalServerError');
    });
  });
});
