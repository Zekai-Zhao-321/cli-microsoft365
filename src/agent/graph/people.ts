import { GraphClient } from '../graph-client.js';
import { GraphRequestOptions, GraphResponse } from '../types.js';

interface ListPeopleOptions {
  top?: number;
}

interface ListContactsOptions {
  top?: number;
}

interface SearchUsersOptions {
  top?: number;
}

interface CreateContactData {
  givenName?: string;
  surname?: string;
  emailAddresses?: { address: string; name: string }[];
  businessPhones?: string[];
  jobTitle?: string;
  companyName?: string;
  [key: string]: any;
}

interface UpdateContactData {
  givenName?: string;
  surname?: string;
  emailAddresses?: { address: string; name: string }[];
  businessPhones?: string[];
  jobTitle?: string;
  companyName?: string;
  [key: string]: any;
}

export class PeopleOperations {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
  }

  public async listRelevantPeople(options?: ListPeopleOptions): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }
    return this.client.get<any[]>('/me/people', graphOptions);
  }

  public async searchPeople(query: string, options?: ListPeopleOptions): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions & { search?: string } = {};
    graphOptions.search = `"${query}"`;
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }
    return this.client.get<any[]>('/me/people', graphOptions);
  }

  public async listContacts(options?: ListContactsOptions): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }
    return this.client.get<any[]>('/me/contacts', graphOptions);
  }

  public async getContact(contactId: string): Promise<GraphResponse<any>> {
    return this.client.get<any>(`/me/contacts/${contactId}`);
  }

  public async createContact(data: CreateContactData): Promise<GraphResponse<any>> {
    const body: Record<string, any> = {};
    if (data.givenName !== undefined) { body.givenName = data.givenName; }
    if (data.surname !== undefined) { body.surname = data.surname; }
    if (data.emailAddresses !== undefined) { body.emailAddresses = data.emailAddresses; }
    if (data.businessPhones !== undefined) { body.businessPhones = data.businessPhones; }
    if (data.jobTitle !== undefined) { body.jobTitle = data.jobTitle; }
    if (data.companyName !== undefined) { body.companyName = data.companyName; }
    return this.client.post<any>('/me/contacts', body);
  }

  public async updateContact(contactId: string, updates: UpdateContactData): Promise<GraphResponse<any>> {
    const body: Record<string, any> = { ...updates };
    return this.client.patch<any>(`/me/contacts/${contactId}`, body);
  }

  public async deleteContact(contactId: string): Promise<GraphResponse<void>> {
    return this.client.delete(`/me/contacts/${contactId}`);
  }

  public async getUserProfile(idOrUpn: string): Promise<GraphResponse<any>> {
    return this.client.get<any>(`/users/${idOrUpn}`);
  }

  public async searchUsers(query: string, options?: SearchUsersOptions): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions = {};
    graphOptions.filter = `startsWith(displayName,'${query.replace(/'/g, "''")}')`;
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }
    return this.client.get<any[]>('/users', graphOptions);
  }

  public async getUserManager(idOrUpn: string): Promise<GraphResponse<any>> {
    return this.client.get<any>(`/users/${idOrUpn}/manager`);
  }

  public async getUserDirectReports(idOrUpn: string): Promise<GraphResponse<any[]>> {
    return this.client.get<any[]>(`/users/${idOrUpn}/directReports`);
  }

  public async getUserPhoto(idOrUpn: string, size?: string): Promise<GraphResponse<any>> {
    const endpoint = size
      ? `/users/${idOrUpn}/photos/${size}/$value`
      : `/users/${idOrUpn}/photo/$value`;
    return this.client.get<any>(endpoint);
  }
}
