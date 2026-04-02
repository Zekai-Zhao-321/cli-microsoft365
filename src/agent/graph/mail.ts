import { GraphClient } from '../graph-client.js';
import { GraphRequestOptions, GraphResponse } from '../types.js';

interface SendMailOptions {
  to: string[];
  subject: string;
  body: string;
  bodyType?: 'Text' | 'HTML';
  cc?: string[];
  bcc?: string[];
  importance?: string;
  attachments?: { name: string; contentBytes: string }[];
  saveToSentItems?: boolean;
}

interface CreateDraftOptions {
  to: string[];
  subject: string;
  body: string;
  bodyType?: 'Text' | 'HTML';
}

interface ListInboxOptions {
  top?: number;
  filter?: string;
  select?: string[];
}

interface SearchMailOptions {
  top?: number;
}

interface CreateRuleOptions {
  displayName: string;
  conditions: any;
  actions: any;
}

interface AttachmentInput {
  name: string;
  contentBytes: string;
}

function toRecipients(emails: string[]): { emailAddress: { address: string } }[] {
  return emails.map(email => ({ emailAddress: { address: email } }));
}

export class MailOperations {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
  }

  public async listInbox(options?: ListInboxOptions): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }
    if (options?.filter) {
      graphOptions.filter = options.filter;
    }
    if (options?.select) {
      graphOptions.select = options.select;
    }
    return this.client.get('/me/messages', graphOptions);
  }

  public async getMessage(id: string): Promise<GraphResponse<any>> {
    return this.client.get(`/me/messages/${id}`);
  }

  public async getUnreadCount(): Promise<GraphResponse<number>> {
    const response = await this.client.get('/me/mailFolders/inbox');
    if (!response.success) {
      return response as any;
    }
    return {
      success: true,
      data: response.data.unreadItemCount,
      tokenEstimate: response.tokenEstimate
    };
  }

  public async sendMail(options: SendMailOptions): Promise<GraphResponse<any>> {
    const body: any = {
      message: {
        subject: options.subject,
        body: {
          contentType: options.bodyType || 'Text',
          content: options.body
        },
        toRecipients: toRecipients(options.to)
      }
    };

    if (options.cc) {
      body.message.ccRecipients = toRecipients(options.cc);
    }
    if (options.bcc) {
      body.message.bccRecipients = toRecipients(options.bcc);
    }
    if (options.importance) {
      body.message.importance = options.importance;
    }
    if (options.attachments) {
      body.message.attachments = options.attachments;
    }
    if (options.saveToSentItems !== undefined) {
      body.saveToSentItems = options.saveToSentItems;
    }

    return this.client.post('/me/sendMail', body);
  }

  public async createDraft(options: CreateDraftOptions): Promise<GraphResponse<any>> {
    const body: any = {
      subject: options.subject,
      body: {
        contentType: options.bodyType || 'Text',
        content: options.body
      },
      toRecipients: toRecipients(options.to)
    };

    return this.client.post('/me/messages', body);
  }

  public async replyToMessage(id: string, comment: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/messages/${id}/reply`, { comment });
  }

  public async replyAllToMessage(id: string, comment: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/messages/${id}/replyAll`, { comment });
  }

  public async forwardMessage(id: string, to: string[], comment?: string): Promise<GraphResponse<any>> {
    const body: any = {
      toRecipients: toRecipients(to)
    };
    if (comment !== undefined) {
      body.comment = comment;
    }
    return this.client.post(`/me/messages/${id}/forward`, body);
  }

  public async moveMessage(id: string, destinationId: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/messages/${id}/move`, { destinationId });
  }

  public async deleteMessage(id: string): Promise<GraphResponse<any>> {
    return this.client.delete(`/me/messages/${id}`);
  }

  public async markAsRead(id: string): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/messages/${id}`, { isRead: true });
  }

  public async markAsUnread(id: string): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/messages/${id}`, { isRead: false });
  }

  public async flagMessage(id: string): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/messages/${id}`, { flag: { flagStatus: 'flagged' } });
  }

  public async unflagMessage(id: string): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/messages/${id}`, { flag: { flagStatus: 'notFlagged' } });
  }

  public async categorizeMessage(id: string, categories: string[]): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/messages/${id}`, { categories });
  }

  public async searchMail(query: string, options?: SearchMailOptions): Promise<GraphResponse<any[]>> {
    const size = options?.top ?? 25;
    const body = {
      requests: [{
        entityTypes: ['message'],
        query: { queryString: query },
        from: 0,
        size
      }]
    };

    const response = await this.client.post('/search/query', body);
    if (!response.success) {
      return response as any;
    }

    const hitsContainers = response.data?.value?.[0]?.hitsContainers;
    const hits = hitsContainers?.[0]?.hits ?? [];
    const results = hits.map((h: any) => h.resource);

    return {
      success: true,
      data: results,
      tokenEstimate: response.tokenEstimate
    };
  }

  public async listFolders(): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/mailFolders');
  }

  public async createFolder(displayName: string, parentFolderId?: string): Promise<GraphResponse<any>> {
    const endpoint = parentFolderId
      ? `/me/mailFolders/${parentFolderId}/childFolders`
      : '/me/mailFolders';
    return this.client.post(endpoint, { displayName });
  }

  public async deleteFolder(id: string): Promise<GraphResponse<any>> {
    return this.client.delete(`/me/mailFolders/${id}`);
  }

  public async listAttachments(messageId: string): Promise<GraphResponse<any[]>> {
    return this.client.get(`/me/messages/${messageId}/attachments`);
  }

  public async getAttachment(messageId: string, attachmentId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/me/messages/${messageId}/attachments/${attachmentId}`);
  }

  public async addAttachment(messageId: string, attachment: AttachmentInput): Promise<GraphResponse<any>> {
    return this.client.post(`/me/messages/${messageId}/attachments`, attachment);
  }

  public async bulkMove(messageIds: string[], destinationId: string): Promise<GraphResponse<any>> {
    const requests = messageIds.map((id, index) => ({
      id: String(index),
      method: 'POST',
      url: `/me/messages/${id}/move`,
      body: { destinationId },
      headers: { 'Content-Type': 'application/json' }
    }));

    const response = await this.client.post('/$batch', { requests });
    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: { moved: response.data.responses?.length ?? messageIds.length },
      tokenEstimate: response.tokenEstimate
    };
  }

  public async bulkMarkRead(messageIds: string[]): Promise<GraphResponse<any>> {
    const requests = messageIds.map((id, index) => ({
      id: String(index),
      method: 'PATCH',
      url: `/me/messages/${id}`,
      body: { isRead: true },
      headers: { 'Content-Type': 'application/json' }
    }));

    const response = await this.client.post('/$batch', { requests });
    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: { updated: response.data.responses?.length ?? messageIds.length },
      tokenEstimate: response.tokenEstimate
    };
  }

  public async bulkDelete(messageIds: string[]): Promise<GraphResponse<any>> {
    const requests = messageIds.map((id, index) => ({
      id: String(index),
      method: 'DELETE',
      url: `/me/messages/${id}`,
      headers: { 'Content-Type': 'application/json' }
    }));

    const response = await this.client.post('/$batch', { requests });
    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: { deleted: response.data.responses?.length ?? messageIds.length },
      tokenEstimate: response.tokenEstimate
    };
  }

  public async listRules(): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/mailFolders/inbox/messageRules');
  }

  public async createRule(rule: CreateRuleOptions): Promise<GraphResponse<any>> {
    return this.client.post('/me/mailFolders/inbox/messageRules', {
      displayName: rule.displayName,
      conditions: rule.conditions,
      actions: rule.actions
    });
  }

  public async deleteRule(id: string): Promise<GraphResponse<any>> {
    return this.client.delete(`/me/mailFolders/inbox/messageRules/${id}`);
  }

  public async listCategories(): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/outlook/masterCategories');
  }

  public async createCategory(displayName: string, color: string): Promise<GraphResponse<any>> {
    return this.client.post('/me/outlook/masterCategories', { displayName, color });
  }
}
