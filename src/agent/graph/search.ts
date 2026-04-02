import { GraphClient } from '../graph-client.js';
import { GraphResponse } from '../types.js';

export type SearchEntityType = 'message' | 'event' | 'driveItem' | 'site' | 'list' | 'listItem';

export interface SearchFilters {
  dateRange?: { start: string; end: string };
  from?: string;
}

interface SearchOptions {
  entityTypes?: SearchEntityType[];
  top?: number;
}

const ALL_ENTITY_TYPES: SearchEntityType[] = ['message', 'event', 'driveItem', 'site', 'list', 'listItem'];

export class SearchOperations {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
  }

  public async searchAll(query: string, options?: SearchOptions): Promise<GraphResponse<any[]>> {
    const entityTypes = options?.entityTypes ?? ALL_ENTITY_TYPES;
    const size = options?.top ?? 25;

    const body = {
      requests: [{
        entityTypes,
        query: { queryString: query },
        from: 0,
        size
      }]
    };

    const response = await this.client.post('/search/query', body);

    if (!response.success) {
      return {
        success: false,
        data: [],
        tokenEstimate: 0,
        error: response.error
      };
    }

    return {
      success: true,
      data: this.extractHits(response.data),
      tokenEstimate: response.tokenEstimate
    };
  }

  public async searchByEntityType(query: string, entityType: SearchEntityType, options?: { top?: number }): Promise<GraphResponse<any[]>> {
    return this.searchAll(query, {
      entityTypes: [entityType],
      top: options?.top
    });
  }

  public async searchWithFilters(query: string, filters: SearchFilters, options?: SearchOptions): Promise<GraphResponse<any[]>> {
    let queryString = query;

    if (filters.dateRange) {
      queryString += ` received>=${filters.dateRange.start} received<=${filters.dateRange.end}`;
    }

    if (filters.from) {
      queryString += ` from:${filters.from}`;
    }

    const entityTypes = options?.entityTypes ?? ALL_ENTITY_TYPES;
    const size = options?.top ?? 25;

    const body = {
      requests: [{
        entityTypes,
        query: { queryString },
        from: 0,
        size
      }]
    };

    const response = await this.client.post('/search/query', body);

    if (!response.success) {
      return {
        success: false,
        data: [],
        tokenEstimate: 0,
        error: response.error
      };
    }

    return {
      success: true,
      data: this.extractHits(response.data),
      tokenEstimate: response.tokenEstimate
    };
  }

  public async getSearchSuggestions(query: string, entityTypes?: SearchEntityType[]): Promise<GraphResponse<any[]>> {
    const body = {
      requests: [{
        entityTypes: entityTypes ?? ALL_ENTITY_TYPES,
        query: { queryString: query },
        from: 0,
        size: 25
      }]
    };

    const response = await this.client.post('/search/query', body);

    if (!response.success) {
      return {
        success: false,
        data: [],
        tokenEstimate: 0,
        error: response.error
      };
    }

    const suggestions: any[] = [];
    const values = response.data?.value;
    if (Array.isArray(values)) {
      for (const item of values) {
        if (item.queryAlterationResponse) {
          suggestions.push(item.queryAlterationResponse);
        }
      }
    }

    return {
      success: true,
      data: suggestions,
      tokenEstimate: response.tokenEstimate
    };
  }

  private extractHits(data: any): any[] {
    const hits: any[] = [];
    const values = data?.value;
    if (Array.isArray(values)) {
      for (const container of values) {
        if (container.hitsContainers && Array.isArray(container.hitsContainers)) {
          for (const hc of container.hitsContainers) {
            if (hc.hits && Array.isArray(hc.hits)) {
              hits.push(...hc.hits);
            }
          }
        }
      }
    }
    return hits;
  }
}
