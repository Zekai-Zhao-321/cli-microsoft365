export interface GraphResponse<T> {
  success: boolean;
  data: T;
  totalCount?: number;
  page?: number;
  hasMore?: boolean;
  error?: AgentError;
  tokenEstimate: number;
}

export interface AgentError {
  message: string;
  code?: string;
  suggestion?: string;
}

export interface GraphRequestOptions {
  select?: string[];
  filter?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
  expand?: string;
  maxTokens?: number;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface FormatterOptions {
  maxTokens?: number;
  fields?: string[];
  page?: number;
  pageSize?: number;
}

export interface FormatterResult<T> {
  formatted: T;
  tokenEstimate: number;
  truncated: boolean;
  totalCount?: number;
}
