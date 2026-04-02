import { GraphClient } from '../graph-client.js';
import { GraphRequestOptions, GraphResponse } from '../types.js';

interface ListRootFilesOptions {
  driveId?: string;
  select?: string[];
  top?: number;
}

interface ListFolderFilesOptions {
  select?: string[];
  top?: number;
}

interface GetFileOptions {
  select?: string[];
}

export class FilesOperations {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
  }

  public async listRootFiles(options?: ListRootFilesOptions): Promise<GraphResponse<any[]>> {
    const endpoint = options?.driveId
      ? `/drives/${options.driveId}/root/children`
      : '/me/drive/root/children';

    const graphOptions: GraphRequestOptions = {};
    if (options?.select) {
      graphOptions.select = options.select;
    }
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }

    return this.client.get(endpoint, graphOptions);
  }

  public async listFolderFiles(folderId: string, options?: ListFolderFilesOptions): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.select) {
      graphOptions.select = options.select;
    }
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }

    return this.client.get(`/me/drive/items/${folderId}/children`, graphOptions);
  }

  public async listSharePointDriveFiles(siteId: string, driveId: string, folderId?: string): Promise<GraphResponse<any[]>> {
    const endpoint = folderId
      ? `/sites/${siteId}/drives/${driveId}/items/${folderId}/children`
      : `/sites/${siteId}/drives/${driveId}/root/children`;

    return this.client.get(endpoint);
  }

  public async getFileById(itemId: string, options?: GetFileOptions): Promise<GraphResponse<any>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.select) {
      graphOptions.select = options.select;
    }

    return this.client.get(`/me/drive/items/${itemId}`, graphOptions);
  }

  public async getFileByPath(path: string, options?: GetFileOptions): Promise<GraphResponse<any>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.select) {
      graphOptions.select = options.select;
    }

    return this.client.get(`/me/drive/root:/${path}`, graphOptions);
  }

  public async downloadFile(itemId: string, options?: GetFileOptions): Promise<GraphResponse<any>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.select) {
      graphOptions.select = options.select;
    }

    return this.client.get(`/me/drive/items/${itemId}/content`, graphOptions);
  }

  public async uploadSmallFile(parentFolderId: string, fileName: string, content: Buffer): Promise<GraphResponse<any>> {
    return (this.client as any).put(`/me/drive/items/${parentFolderId}:/${fileName}:/content`, content);
  }

  public async createUploadSession(parentFolderId: string, fileName: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/drive/items/${parentFolderId}:/${fileName}:/createUploadSession`, {});
  }

  public async uploadLargeFileChunk(uploadUrl: string, chunk: Buffer, rangeStart: number, rangeEnd: number, totalSize: number): Promise<GraphResponse<any>> {
    return (this.client as any).put(uploadUrl, chunk, {
      'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`
    });
  }

  public async createFolder(parentFolderId: string, name: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/drive/items/${parentFolderId}/children`, {
      name,
      folder: {}
    });
  }

  public async deleteItem(itemId: string): Promise<GraphResponse<any>> {
    return this.client.delete(`/me/drive/items/${itemId}`);
  }

  public async moveItem(itemId: string, newParentId: string): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/drive/items/${itemId}`, {
      parentReference: { id: newParentId }
    });
  }

  public async copyItem(itemId: string, newParentId: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/drive/items/${itemId}/copy`, {
      parentReference: { id: newParentId }
    });
  }

  public async searchFiles(query: string, options?: { select?: string[]; top?: number }): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.select) {
      graphOptions.select = options.select;
    }
    if (options?.top !== undefined) {
      graphOptions.top = options.top;
    }

    return this.client.get(`/me/drive/search(q='${query}')`, graphOptions);
  }

  public async createSharingLink(itemId: string, type: string, scope: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/drive/items/${itemId}/createLink`, { type, scope });
  }

  public async getRecentFiles(): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/drive/recent');
  }

  public async getSharedWithMe(): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/drive/sharedWithMe');
  }

  public async listFileVersions(itemId: string, options?: GetFileOptions): Promise<GraphResponse<any[]>> {
    const graphOptions: GraphRequestOptions = {};
    if (options?.select) {
      graphOptions.select = options.select;
    }

    return this.client.get(`/me/drive/items/${itemId}/versions`, graphOptions);
  }

  public async restoreFileVersion(itemId: string, versionId: string): Promise<GraphResponse<any>> {
    return this.client.post(`/me/drive/items/${itemId}/versions/${versionId}/restoreVersion`, {});
  }
}
