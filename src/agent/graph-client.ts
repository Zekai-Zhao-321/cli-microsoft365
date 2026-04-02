import auth from '../Auth.js';
import request from '../request.js';
import { AgentError, GraphRequestOptions, GraphResponse } from './types.js';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export class GraphClient {
  public async ensureAuth(): Promise<boolean> {
    try {
      await auth.restoreAuth();
      return auth.connection.active;
    }
    catch {
      return false;
    }
  }

  public async get<T = any>(endpoint: string, options?: GraphRequestOptions): Promise<GraphResponse<T>> {
    try {
      await this.ensureAuth();

      const qs = this.buildQueryString(options || {});
      const url = this.buildUrl(endpoint) + qs;

      const response = await request.get<string>({
        url,
        headers: {
          accept: 'application/json'
        },
        responseType: 'json'
      });

      let parsed: any;
      try {
        parsed = typeof response === 'string' ? JSON.parse(response) : response;
      }
      catch {
        return {
          success: false,
          data: undefined as any,
          tokenEstimate: 0,
          error: { message: 'Failed to parse response' }
        };
      }

      // Strip OData metadata from top level
      delete parsed['@odata.context'];
      delete parsed['@odata.type'];
      delete parsed['@odata.etag'];

      // Strip OData metadata from array items
      if (Array.isArray(parsed.value)) {
        for (const item of parsed.value) {
          delete item['@odata.context'];
          delete item['@odata.type'];
          delete item['@odata.etag'];
        }
      }

      let data: any = parsed.value !== undefined ? parsed.value : parsed;

      // Handle maxTokens truncation
      const maxTokens = options?.maxTokens;
      let hasMore = false;
      if (maxTokens && Array.isArray(data)) {
        while (data.length > 1 && this.estimateTokens(data) > maxTokens) {
          data = data.slice(0, Math.floor(data.length / 2));
          hasMore = true;
        }
        if (data.length === 1 && this.estimateTokens(data) > maxTokens) {
          hasMore = true;
        }
      }

      return {
        success: true,
        data,
        tokenEstimate: this.estimateTokens(data),
        hasMore
      };
    }
    catch (err: any) {
      const agentError = this.translateError(err);
      return {
        success: false,
        data: undefined as any,
        tokenEstimate: 0,
        error: agentError
      };
    }
  }

  public async post<T = any>(endpoint: string, body: any): Promise<GraphResponse<T>> {
    try {
      await this.ensureAuth();

      const url = this.buildUrl(endpoint);

      const response = await request.post<string>({
        url,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        },
        data: JSON.stringify(body),
        responseType: 'json'
      });

      let parsed: any;
      try {
        parsed = typeof response === 'string' ? JSON.parse(response) : response;
      }
      catch {
        parsed = {};
      }

      this.stripODataMetadata(parsed);

      return {
        success: true,
        data: parsed,
        tokenEstimate: this.estimateTokens(parsed)
      };
    }
    catch (err: any) {
      const agentError = this.translateError(err);
      return {
        success: false,
        data: undefined as any,
        tokenEstimate: 0,
        error: agentError
      };
    }
  }

  public async patch<T = any>(endpoint: string, body: any): Promise<GraphResponse<T>> {
    try {
      await this.ensureAuth();

      const url = this.buildUrl(endpoint);

      const response = await request.patch<string>({
        url,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        },
        data: JSON.stringify(body),
        responseType: 'json'
      });

      let parsed: any;
      try {
        parsed = typeof response === 'string' ? JSON.parse(response) : response;
      }
      catch {
        parsed = {};
      }

      this.stripODataMetadata(parsed);

      return {
        success: true,
        data: parsed,
        tokenEstimate: this.estimateTokens(parsed)
      };
    }
    catch (err: any) {
      const agentError = this.translateError(err);
      return {
        success: false,
        data: undefined as any,
        tokenEstimate: 0,
        error: agentError
      };
    }
  }

  public async delete(endpoint: string): Promise<GraphResponse<any>> {
    try {
      await this.ensureAuth();

      const url = this.buildUrl(endpoint);

      await request.delete({
        url,
        headers: {
          accept: 'application/json'
        }
      });

      return {
        success: true,
        data: {},
        tokenEstimate: 0
      };
    }
    catch (err: any) {
      const agentError = this.translateError(err);
      return {
        success: false,
        data: undefined as any,
        tokenEstimate: 0,
        error: agentError
      };
    }
  }

  public async getAll<T = any>(endpoint: string, options?: GraphRequestOptions): Promise<GraphResponse<T[]>> {
    try {
      await this.ensureAuth();

      const allItems: T[] = [];
      let nextUrl: string | undefined = this.buildUrl(endpoint) + this.buildQueryString(options || {});

      while (nextUrl) {
        const response = await request.get<string>({
          url: nextUrl,
          headers: {
            accept: 'application/json'
          },
          responseType: 'json'
        });

        let parsed: any;
        try {
          parsed = typeof response === 'string' ? JSON.parse(response) : response;
        }
        catch {
          break;
        }

        if (Array.isArray(parsed.value)) {
          for (const item of parsed.value) {
            this.stripODataMetadata(item);
            allItems.push(item);
          }
        }

        nextUrl = parsed['@odata.nextLink'] || undefined;
      }

      return {
        success: true,
        data: allItems,
        tokenEstimate: this.estimateTokens(allItems)
      };
    }
    catch (err: any) {
      const agentError = this.translateError(err);
      return {
        success: false,
        data: [] as T[],
        tokenEstimate: 0,
        error: agentError
      };
    }
  }

  private buildUrl(endpoint: string): string {
    return `${GRAPH_BASE_URL}${endpoint}`;
  }

  private buildQueryString(options: GraphRequestOptions): string {
    const params: string[] = [];

    if (options.select && options.select.length > 0) {
      params.push(`$select=${options.select.join(',')}`);
    }
    if (options.filter) {
      params.push(`$filter=${encodeURIComponent(options.filter)}`);
    }
    if (options.top !== undefined) {
      params.push(`$top=${options.top}`);
    }
    if (options.skip !== undefined) {
      params.push(`$skip=${options.skip}`);
    }
    if (options.orderBy) {
      params.push(`$orderby=${encodeURIComponent(options.orderBy)}`);
    }
    if (options.expand) {
      params.push(`$expand=${options.expand}`);
    }

    return params.length > 0 ? `?${params.join('&')}` : '';
  }

  private translateError(error: any): AgentError {
    let code: string | undefined;
    let message: string;
    let suggestion: string | undefined;

    // cli-microsoft365 convention: error.error.error.code
    if (error?.error?.error?.code) {
      code = error.error.error.code;
      message = error.error.error.message || error.message || 'Unknown error';
    }
    else {
      code = undefined;
      message = error?.message || 'Unknown error';
    }

    // Map status codes to suggestions
    const status = error?.response?.status;
    if (status === 401 || code === 'InvalidAuthenticationToken') {
      suggestion = 'Run: m365 login';
    }
    else if (status === 403 || code === 'Authorization_RequestDenied') {
      suggestion = 'Ensure the app has the required permissions for this operation.';
    }
    else if (status === 404 || code === 'ErrorItemNotFound') {
      suggestion = 'Verify the ID or path in the request URL is correct.';
    }

    return {
      message,
      code,
      suggestion
    };
  }

  private stripODataMetadata(obj: any): void {
    if (obj && typeof obj === 'object') {
      delete obj['@odata.context'];
      delete obj['@odata.type'];
      delete obj['@odata.etag'];
    }
  }

  private estimateTokens(data: any): number {
    return Math.ceil(JSON.stringify(data).length / 4);
  }
}
