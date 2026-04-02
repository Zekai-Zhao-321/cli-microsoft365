import { FormatterOptions, FormatterResult } from './types.js';

export function estimateTokens(data: any): number {
  if (data === null || data === undefined) {
    return 0;
  }
  if (typeof data === 'string') {
    return data.length === 0 ? 0 : Math.ceil(data.length / 4);
  }
  const str = JSON.stringify(data);
  return Math.ceil(str.length / 4);
}

export function selectFields<T>(data: T, fields: string[]): any {
  if (Array.isArray(data)) {
    return data.map(item => selectFields(item, fields));
  }

  const result: Record<string, any> = {};
  for (const field of fields) {
    if (field.includes('.')) {
      const parts = field.split('.');
      let val: any = data;
      for (const part of parts) {
        if (val === null || val === undefined || typeof val !== 'object') {
          val = undefined;
          break;
        }
        val = (val as any)[part];
      }
      if (val !== undefined) {
        result[field] = val;
      }
    }
    else {
      if ((data as any)[field] !== undefined) {
        result[field] = (data as any)[field];
      }
    }
  }
  return result;
}

export function truncateString(str: string, maxLength: number, hint?: string): string {
  if (str.length <= maxLength) {
    return str;
  }
  const marker = hint
    ? `[truncated - ${str.length} chars. ${hint}]`
    : `[truncated - ${str.length} chars.]`;
  return str.slice(0, maxLength) + marker;
}

export function paginateArray<T>(arr: T[], page: number, pageSize: number): {
  items: T[];
  totalCount: number;
  page: number;
  hasMore: boolean;
} {
  const start = (page - 1) * pageSize;
  const items = arr.slice(start, start + pageSize);
  return {
    items,
    totalCount: arr.length,
    page,
    hasMore: page * pageSize < arr.length
  };
}

export function formatForAgent<T>(data: T, opts?: FormatterOptions): FormatterResult<T> {
  if (data === null || data === undefined) {
    return {
      formatted: data,
      tokenEstimate: 0,
      truncated: false
    };
  }

  let result: any = data;
  let totalCount: number | undefined;

  // Apply field selection
  if (opts?.fields && typeof data === 'object') {
    result = selectFields(data, opts.fields);
  }

  // Apply pagination
  if (opts?.page !== undefined && opts?.pageSize !== undefined && Array.isArray(result)) {
    const paginated = paginateArray(result, opts.page, opts.pageSize);
    result = paginated.items;
    totalCount = paginated.totalCount;
  }

  const maxTokens = opts?.maxTokens ?? 4000;
  let tokenEst = estimateTokens(result);
  let truncated = false;

  // Truncate if over budget
  if (tokenEst > maxTokens) {
    truncated = true;
    if (Array.isArray(result)) {
      // Slice array to fit
      while (result.length > 0 && estimateTokens(result) > maxTokens) {
        result = result.slice(0, Math.max(1, Math.floor(result.length / 2)));
      }
      // If still too large with 1 element, just keep it
      tokenEst = estimateTokens(result);
    }
    else if (typeof result === 'string') {
      const maxChars = maxTokens * 4;
      result = truncateString(result, maxChars);
      tokenEst = estimateTokens(result);
    }
    else {
      const str = JSON.stringify(result);
      const maxChars = maxTokens * 4;
      if (str.length > maxChars) {
        result = JSON.parse(str.slice(0, maxChars) + '"}') || result;
        tokenEst = estimateTokens(result);
      }
    }
  }

  const output: FormatterResult<T> = {
    formatted: result as T,
    tokenEstimate: tokenEst,
    truncated
  };

  if (totalCount !== undefined) {
    output.totalCount = totalCount;
  }

  return output;
}
