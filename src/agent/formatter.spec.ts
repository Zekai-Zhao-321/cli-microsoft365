import assert from 'assert';
import { formatForAgent, estimateTokens, selectFields, truncateString, paginateArray } from './formatter.js';

describe('Formatter', () => {
  describe('formatForAgent', () => {
    it('should return data unchanged when no options provided', () => {
      const data = { id: '1', subject: 'Test' };
      const result = formatForAgent(data);
      assert.deepStrictEqual(result.formatted, data);
    });

    it('should select only specified fields from object', () => {
      const data = { id: '1', subject: 'Test', body: 'Long body', from: 'user@test.com' };
      const result = formatForAgent(data, { fields: ['id', 'subject'] });
      assert.deepStrictEqual(result.formatted, { id: '1', subject: 'Test' });
    });

    it('should select only specified fields from array of objects', () => {
      const data = [
        { id: '1', subject: 'Test1', body: 'Body1' },
        { id: '2', subject: 'Test2', body: 'Body2' }
      ];
      const result = formatForAgent(data, { fields: ['id', 'subject'] });
      assert.deepStrictEqual(result.formatted, [
        { id: '1', subject: 'Test1' },
        { id: '2', subject: 'Test2' }
      ]);
    });

    it('should paginate array with page and pageSize', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: `${i}` }));
      const result = formatForAgent(data, { page: 2, pageSize: 10 });
      const formatted = result.formatted as any[];
      assert.strictEqual(formatted.length, 10);
      assert.strictEqual(formatted[0].id, '10');
    });

    it('should return hasMore=true when more pages exist', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: `${i}` }));
      const result = formatForAgent(data, { page: 1, pageSize: 10 });
      assert.strictEqual(result.totalCount, 25);
    });

    it('should return hasMore=false on last page', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: `${i}` }));
      const result = formatForAgent(data, { page: 3, pageSize: 10 });
      const formatted = result.formatted as any[];
      assert.strictEqual(formatted.length, 5);
    });

    it('should set totalCount to original array length', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: `${i}` }));
      const result = formatForAgent(data, { page: 1, pageSize: 10 });
      assert.strictEqual(result.totalCount, 25);
    });

    it('should truncate response when exceeding maxTokens', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`, subject: `Message ${i}`, body: 'A'.repeat(500)
      }));
      const result = formatForAgent(data, { maxTokens: 100 });
      assert.strictEqual(result.truncated, true);
    });

    it('should default maxTokens to 4000', () => {
      const smallData = { id: '1', name: 'test' };
      const result = formatForAgent(smallData);
      assert.strictEqual(result.truncated, false);
    });

    it('should handle nested objects in field selection', () => {
      const data = { id: '1', from: { emailAddress: { address: 'test@test.com' } }, subject: 'Test' };
      const result = formatForAgent(data, { fields: ['id', 'from'] });
      assert.deepStrictEqual(result.formatted, { id: '1', from: { emailAddress: { address: 'test@test.com' } } });
    });

    it('should handle null/undefined data gracefully', () => {
      const result = formatForAgent(null as any);
      assert.strictEqual(result.formatted, null);
      assert.strictEqual(result.truncated, false);
    });

    it('should handle empty array', () => {
      const result = formatForAgent([]);
      assert.deepStrictEqual(result.formatted, []);
      assert.strictEqual(result.tokenEstimate, estimateTokens([]));
    });

    it('should handle empty object', () => {
      const result = formatForAgent({});
      assert.deepStrictEqual(result.formatted, {});
    });
  });

  describe('estimateTokens', () => {
    it('should estimate ~1 token per 4 characters', () => {
      const str = 'a'.repeat(400);
      const tokens = estimateTokens(str);
      assert.strictEqual(tokens, 100);
    });

    it('should handle empty string as 0 tokens', () => {
      assert.strictEqual(estimateTokens(''), 0);
    });

    it('should handle objects by stringifying first', () => {
      const obj = { id: '1', name: 'test' };
      const tokens = estimateTokens(obj);
      const expected = Math.ceil(JSON.stringify(obj).length / 4);
      assert.strictEqual(tokens, expected);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      const tokens = estimateTokens(arr);
      const expected = Math.ceil(JSON.stringify(arr).length / 4);
      assert.strictEqual(tokens, expected);
    });

    it('should handle null/undefined as 0 tokens', () => {
      assert.strictEqual(estimateTokens(null), 0);
      assert.strictEqual(estimateTokens(undefined), 0);
    });
  });

  describe('selectFields', () => {
    it('should pick specified fields from flat object', () => {
      const obj = { id: '1', subject: 'Test', body: 'Body', from: 'user' };
      const result = selectFields(obj, ['id', 'subject']);
      assert.deepStrictEqual(result, { id: '1', subject: 'Test' });
    });

    it('should ignore fields that do not exist', () => {
      const obj = { id: '1', subject: 'Test' };
      const result = selectFields(obj, ['id', 'nonexistent']);
      assert.deepStrictEqual(result, { id: '1' });
    });

    it('should apply to each item in an array', () => {
      const arr = [
        { id: '1', subject: 'A', body: 'X' },
        { id: '2', subject: 'B', body: 'Y' }
      ];
      const result = selectFields(arr, ['id', 'subject']);
      assert.deepStrictEqual(result, [
        { id: '1', subject: 'A' },
        { id: '2', subject: 'B' }
      ]);
    });

    it('should handle dot-notation for nested fields', () => {
      const obj = { id: '1', from: { emailAddress: { address: 'a@b.com', name: 'A' } } };
      const result = selectFields(obj, ['id', 'from.emailAddress.address']);
      assert.deepStrictEqual(result, { id: '1', 'from.emailAddress.address': 'a@b.com' });
    });

    it('should return empty object when no fields match', () => {
      const obj = { id: '1', subject: 'Test' };
      const result = selectFields(obj, ['nonexistent1', 'nonexistent2']);
      assert.deepStrictEqual(result, {});
    });
  });

  describe('truncateString', () => {
    it('should not truncate strings under maxLength', () => {
      const result = truncateString('short text', 100);
      assert.strictEqual(result, 'short text');
    });

    it('should truncate strings over maxLength', () => {
      const longStr = 'A'.repeat(200);
      const result = truncateString(longStr, 50);
      assert(result.length < 200);
    });

    it('should append truncation hint', () => {
      const longStr = 'A'.repeat(200);
      const result = truncateString(longStr, 50, 'Use getMessage for full body');
      assert(result.includes('[truncated'));
      assert(result.includes('Use getMessage for full body'));
    });

    it('should include original length in truncation message', () => {
      const longStr = 'A'.repeat(200);
      const result = truncateString(longStr, 50);
      assert(result.includes('200'));
    });

    it('should handle HTML content truncation', () => {
      const html = '<div>' + 'A'.repeat(200) + '</div>';
      const result = truncateString(html, 50);
      assert(result.includes('[truncated'));
    });
  });

  describe('paginateArray', () => {
    const data = Array.from({ length: 25 }, (_, i) => ({ id: `${i}` }));

    it('should return correct slice for page 1', () => {
      const result = paginateArray(data, 1, 10);
      assert.strictEqual(result.items.length, 10);
      assert.strictEqual(result.items[0].id, '0');
      assert.strictEqual(result.items[9].id, '9');
    });

    it('should return correct slice for page 2', () => {
      const result = paginateArray(data, 2, 10);
      assert.strictEqual(result.items.length, 10);
      assert.strictEqual(result.items[0].id, '10');
    });

    it('should return empty array for page beyond data', () => {
      const result = paginateArray(data, 10, 10);
      assert.strictEqual(result.items.length, 0);
      assert.strictEqual(result.hasMore, false);
    });

    it('should handle pageSize larger than array', () => {
      const result = paginateArray(data, 1, 100);
      assert.strictEqual(result.items.length, 25);
      assert.strictEqual(result.hasMore, false);
      assert.strictEqual(result.totalCount, 25);
    });

    it('should default to page 1, pageSize 10', () => {
      const result = paginateArray(data, 1, 10);
      assert.strictEqual(result.page, 1);
      assert.strictEqual(result.items.length, 10);
    });
  });
});
