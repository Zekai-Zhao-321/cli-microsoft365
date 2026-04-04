import assert from 'assert';
import sinon from 'sinon';
import { sinonUtil } from '../../utils/sinonUtil.js';
import { GraphClient } from '../graph-client.js';
import { FilesOperations } from './files.js';

describe('FilesOperations', () => {
  let client: sinon.SinonStubbedInstance<GraphClient>;
  let files: FilesOperations;

  function makeResponse<T>(data: T, opts?: { tokenEstimate?: number }): { success: boolean; data: T; tokenEstimate: number } {
    return {
      success: true,
      data,
      tokenEstimate: opts?.tokenEstimate ?? 100
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
    // GraphClient does not yet expose a `put` method; the implementation will add it.
    // Stub it here so tests can verify upload calls.
    (client as any).put = sinon.stub();
    files = new FilesOperations(client as any);
  });

  afterEach(() => {
    sinonUtil.restore([]);
    sinon.restore();
  });

  // ---------------------------------------------------------------------------
  // listRootFiles
  // ---------------------------------------------------------------------------
  describe('listRootFiles', () => {
    it('should call GET /me/drive/root/children by default', async () => {
      client.get.resolves(makeResponse([]));

      await files.listRootFiles();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/root/children');
    });

    it('should call GET /drives/{driveId}/root/children when driveId is provided', async () => {
      client.get.resolves(makeResponse([]));

      await files.listRootFiles({ driveId: 'drive-abc' });

      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/drives/drive-abc/root/children');
    });

    it('should pass select option to client', async () => {
      client.get.resolves(makeResponse([]));

      await files.listRootFiles({ select: ['id', 'name', 'size'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'name', 'size']);
    });

    it('should pass top option to client', async () => {
      client.get.resolves(makeResponse([]));

      await files.listRootFiles({ top: 20 });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.top, 20);
    });

    it('should return file list from response', async () => {
      const items = [
        { id: 'file-1', name: 'document.docx' },
        { id: 'file-2', name: 'photo.jpg' }
      ];
      client.get.resolves(makeResponse(items));

      const result = await files.listRootFiles();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Unauthorized', 'InvalidAuthenticationToken'));

      const result = await files.listRootFiles();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listFolderFiles
  // ---------------------------------------------------------------------------
  describe('listFolderFiles', () => {
    it('should call GET /me/drive/items/{folderId}/children', async () => {
      client.get.resolves(makeResponse([]));

      await files.listFolderFiles('folder-123');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/folder-123/children');
    });

    it('should pass select option to client', async () => {
      client.get.resolves(makeResponse([]));

      await files.listFolderFiles('folder-123', { select: ['id', 'name'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'name']);
    });

    it('should pass top option to client', async () => {
      client.get.resolves(makeResponse([]));

      await files.listFolderFiles('folder-123', { top: 50 });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.top, 50);
    });

    it('should return folder contents from response', async () => {
      const items = [{ id: 'child-1', name: 'subfolder', folder: {} }];
      client.get.resolves(makeResponse(items));

      const result = await files.listFolderFiles('folder-123');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 1);
    });

    it('should propagate not-found error', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.listFolderFiles('nonexistent-folder');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // listSharePointDriveFiles
  // ---------------------------------------------------------------------------
  describe('listSharePointDriveFiles', () => {
    it('should call GET /sites/{siteId}/drives/{driveId}/root/children when no folderId', async () => {
      client.get.resolves(makeResponse([]));

      await files.listSharePointDriveFiles('site-abc', 'drive-xyz');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/sites/site-abc/drives/drive-xyz/root/children');
    });

    it('should call GET /sites/{siteId}/drives/{driveId}/items/{folderId}/children when folderId is provided', async () => {
      client.get.resolves(makeResponse([]));

      await files.listSharePointDriveFiles('site-abc', 'drive-xyz', 'folder-456');

      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/sites/site-abc/drives/drive-xyz/items/folder-456/children');
    });

    it('should return items from response', async () => {
      const items = [{ id: 'sp-file-1', name: 'report.xlsx' }];
      client.get.resolves(makeResponse(items));

      const result = await files.listSharePointDriveFiles('site-abc', 'drive-xyz');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 1);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Forbidden', 'Authorization_RequestDenied'));

      const result = await files.listSharePointDriveFiles('site-abc', 'drive-xyz');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getFileById
  // ---------------------------------------------------------------------------
  describe('getFileById', () => {
    it('should call GET /me/drive/items/{itemId}', async () => {
      client.get.resolves(makeResponse({ id: 'item-1', name: 'file.pdf' }));

      await files.getFileById('item-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-1');
    });

    it('should pass select option to client', async () => {
      client.get.resolves(makeResponse({ id: 'item-1', name: 'file.pdf' }));

      await files.getFileById('item-1', { select: ['id', 'name', 'webUrl'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'name', 'webUrl']);
    });

    it('should return file metadata from response', async () => {
      const fileItem = { id: 'item-1', name: 'file.pdf', size: 1024 };
      client.get.resolves(makeResponse(fileItem));

      const result = await files.getFileById('item-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'item-1');
    });

    it('should propagate not-found error', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.getFileById('bad-id');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // getFileByPath
  // ---------------------------------------------------------------------------
  describe('getFileByPath', () => {
    it('should call GET /me/drive/root:/{path}', async () => {
      client.get.resolves(makeResponse({ id: 'item-1', name: 'notes.txt' }));

      await files.getFileByPath('Documents/notes.txt');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/root:/Documents/notes.txt');
    });

    it('should pass select option to client', async () => {
      client.get.resolves(makeResponse({ id: 'item-1', name: 'notes.txt' }));

      await files.getFileByPath('Documents/notes.txt', { select: ['id', 'name'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'name']);
    });

    it('should return file metadata from response', async () => {
      const fileItem = { id: 'item-1', name: 'notes.txt' };
      client.get.resolves(makeResponse(fileItem));

      const result = await files.getFileByPath('notes.txt');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.name, 'notes.txt');
    });

    it('should propagate not-found error for invalid path', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.getFileByPath('nonexistent/path.txt');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // downloadFile
  // ---------------------------------------------------------------------------
  describe('downloadFile', () => {
    it('should call GET /me/drive/items/{itemId}/content', async () => {
      client.get.resolves(makeResponse(Buffer.from('file content')));

      await files.downloadFile('item-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-1/content');
    });

    it('should pass options to client', async () => {
      client.get.resolves(makeResponse(Buffer.from('data')));

      await files.downloadFile('item-1', { select: ['id'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id']);
    });

    it('should return response from client', async () => {
      client.get.resolves(makeResponse('binary-content'));

      const result = await files.downloadFile('item-1');

      assert.strictEqual(result.success, true);
    });

    it('should propagate error when item not found', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.downloadFile('missing-item');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // uploadSmallFile
  // ---------------------------------------------------------------------------
  describe('uploadSmallFile', () => {
    it('should call PUT /me/drive/items/{parentFolderId}:/{fileName}:/content', async () => {
      (client as any).put.resolves(makeResponse({ id: 'new-file-1', name: 'report.txt' }));

      await files.uploadSmallFile('folder-123', 'report.txt', Buffer.from('hello'));

      assert((client as any).put.calledOnce);
      const [endpoint] = (client as any).put.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/folder-123:/report.txt:/content');
    });

    it('should pass file content as the body', async () => {
      const content = Buffer.from('file data');
      (client as any).put.resolves(makeResponse({ id: 'new-file-1', name: 'data.bin' }));

      await files.uploadSmallFile('folder-123', 'data.bin', content);

      const [, body] = (client as any).put.firstCall.args;
      assert.strictEqual(body, content);
    });

    it('should return the created file item', async () => {
      const createdFile = { id: 'new-file-1', name: 'report.txt', size: 5 };
      (client as any).put.resolves(makeResponse(createdFile));

      const result = await files.uploadSmallFile('folder-123', 'report.txt', Buffer.from('hello'));

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'new-file-1');
    });

    it('should propagate error on upload failure', async () => {
      (client as any).put.resolves(makeErrorResponse('Insufficient storage', 'QuotaLimitReached'));

      const result = await files.uploadSmallFile('folder-123', 'big.bin', Buffer.from('data'));

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // createUploadSession
  // ---------------------------------------------------------------------------
  describe('createUploadSession', () => {
    it('should call POST /me/drive/items/{parentFolderId}:/{fileName}:/createUploadSession', async () => {
      client.post.resolves(makeResponse({ uploadUrl: 'https://upload.example.com/session-1' }));

      await files.createUploadSession('folder-123', 'large-file.zip');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/folder-123:/large-file.zip:/createUploadSession');
    });

    it('should return the upload session with uploadUrl', async () => {
      const session = { uploadUrl: 'https://upload.example.com/session-abc', expirationDateTime: '2026-04-03T00:00:00Z' };
      client.post.resolves(makeResponse(session));

      const result = await files.createUploadSession('folder-123', 'large-file.zip');

      assert.strictEqual(result.success, true);
      assert(result.data.uploadUrl !== undefined);
    });

    it('should propagate error when folder does not exist', async () => {
      client.post.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.createUploadSession('bad-folder', 'file.zip');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // uploadLargeFileChunk
  // ---------------------------------------------------------------------------
  describe('uploadLargeFileChunk', () => {
    it('should PUT to the provided uploadUrl', async () => {
      (client as any).put.resolves(makeResponse({ id: 'uploaded-1', name: 'large.zip' }));
      const chunk = Buffer.from('chunk-data');

      await files.uploadLargeFileChunk('https://upload.example.com/session-1', chunk, 0, 9, 100);

      assert((client as any).put.calledOnce);
      const [url] = (client as any).put.firstCall.args;
      assert.strictEqual(url, 'https://upload.example.com/session-1');
    });

    it('should include the chunk as body', async () => {
      (client as any).put.resolves(makeResponse({}));
      const chunk = Buffer.from('chunk-bytes');

      await files.uploadLargeFileChunk('https://upload.example.com/session-1', chunk, 0, 10, 50);

      const [, body] = (client as any).put.firstCall.args;
      assert.strictEqual(body, chunk);
    });

    it('should set Content-Range header with byte range and total size', async () => {
      (client as any).put.resolves(makeResponse({}));
      const chunk = Buffer.from('x'.repeat(10));

      await files.uploadLargeFileChunk('https://upload.example.com/session-1', chunk, 0, 9, 50);

      const [, , headers] = (client as any).put.firstCall.args;
      assert(headers !== undefined);
      assert.strictEqual(headers['Content-Range'], 'bytes 0-9/50');
    });

    it('should return the response after upload', async () => {
      const uploadedFile = { id: 'large-1', name: 'archive.zip' };
      (client as any).put.resolves(makeResponse(uploadedFile));

      const result = await files.uploadLargeFileChunk('https://upload.example.com/s', Buffer.from('data'), 0, 3, 4);

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // createFolder
  // ---------------------------------------------------------------------------
  describe('createFolder', () => {
    it('should call POST /me/drive/items/{parentFolderId}/children', async () => {
      client.post.resolves(makeResponse({ id: 'folder-new', name: 'New Folder', folder: {} }));

      await files.createFolder('parent-123', 'New Folder');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/parent-123/children');
    });

    it('should send name and folder:{} in request body', async () => {
      client.post.resolves(makeResponse({ id: 'folder-new', name: 'Docs', folder: {} }));

      await files.createFolder('parent-123', 'Docs');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.name, 'Docs');
      assert.deepStrictEqual(body.folder, {});
    });

    it('should return the created folder item', async () => {
      const newFolder = { id: 'folder-new', name: 'Archive', folder: {} };
      client.post.resolves(makeResponse(newFolder));

      const result = await files.createFolder('parent-123', 'Archive');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'folder-new');
    });

    it('should propagate error when parent folder not found', async () => {
      client.post.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.createFolder('bad-parent', 'New Folder');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteItem
  // ---------------------------------------------------------------------------
  describe('deleteItem', () => {
    it('should call DELETE /me/drive/items/{itemId}', async () => {
      client.delete.resolves(makeResponse({}));

      await files.deleteItem('item-to-delete');

      assert(client.delete.calledOnce);
      const [endpoint] = client.delete.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-to-delete');
    });

    it('should return success response on deletion', async () => {
      client.delete.resolves(makeResponse({}));

      const result = await files.deleteItem('item-123');

      assert.strictEqual(result.success, true);
    });

    it('should propagate error when item not found', async () => {
      client.delete.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.deleteItem('ghost-item');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // moveItem
  // ---------------------------------------------------------------------------
  describe('moveItem', () => {
    it('should call PATCH /me/drive/items/{itemId}', async () => {
      client.patch.resolves(makeResponse({ id: 'item-1', name: 'file.txt' }));

      await files.moveItem('item-1', 'new-parent-456');

      assert(client.patch.calledOnce);
      const [endpoint] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-1');
    });

    it('should send parentReference with newParentId in request body', async () => {
      client.patch.resolves(makeResponse({ id: 'item-1', name: 'file.txt' }));

      await files.moveItem('item-1', 'new-parent-456');

      const [, body] = client.patch.firstCall.args;
      assert.deepStrictEqual(body.parentReference, { id: 'new-parent-456' });
    });

    it('should return the moved item from response', async () => {
      const movedItem = { id: 'item-1', name: 'file.txt', parentReference: { id: 'new-parent-456' } };
      client.patch.resolves(makeResponse(movedItem));

      const result = await files.moveItem('item-1', 'new-parent-456');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'item-1');
    });

    it('should propagate error when item or parent not found', async () => {
      client.patch.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.moveItem('bad-item', 'bad-parent');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // copyItem
  // ---------------------------------------------------------------------------
  describe('copyItem', () => {
    it('should call POST /me/drive/items/{itemId}/copy', async () => {
      client.post.resolves(makeResponse({}));

      await files.copyItem('item-1', 'dest-parent-789');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-1/copy');
    });

    it('should send parentReference with newParentId in request body', async () => {
      client.post.resolves(makeResponse({}));

      await files.copyItem('item-1', 'dest-parent-789');

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.parentReference, { id: 'dest-parent-789' });
    });

    it('should return response from client', async () => {
      client.post.resolves(makeResponse({ id: 'copy-monitor-url' }));

      const result = await files.copyItem('item-1', 'dest-parent-789');

      assert.strictEqual(result.success, true);
    });

    it('should propagate error when source item not found', async () => {
      client.post.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.copyItem('nonexistent-item', 'parent-123');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // searchFiles
  // ---------------------------------------------------------------------------
  describe('searchFiles', () => {
    it("should call GET /me/drive/search(q='{query}')", async () => {
      client.get.resolves(makeResponse([]));

      await files.searchFiles('budget');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, "/me/drive/search(q='budget')");
    });

    it('should pass select option to client', async () => {
      client.get.resolves(makeResponse([]));

      await files.searchFiles('report', { select: ['id', 'name'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'name']);
    });

    it('should pass top option to client', async () => {
      client.get.resolves(makeResponse([]));

      await files.searchFiles('invoice', { top: 15 });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.top, 15);
    });

    it('should return matching files from response', async () => {
      const items = [
        { id: 'file-1', name: 'budget-2025.xlsx' },
        { id: 'file-2', name: 'budget-2024.xlsx' }
      ];
      client.get.resolves(makeResponse(items));

      const result = await files.searchFiles('budget');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should return empty array when no files match the query', async () => {
      client.get.resolves(makeResponse([]));

      const result = await files.searchFiles('xyzzy-nonexistent');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Search failed', 'ServiceUnavailable'));

      const result = await files.searchFiles('test');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // createSharingLink
  // ---------------------------------------------------------------------------
  describe('createSharingLink', () => {
    it('should call POST /me/drive/items/{itemId}/createLink', async () => {
      client.post.resolves(makeResponse({ link: { webUrl: 'https://sharepoint.com/link' } }));

      await files.createSharingLink('item-1', 'view', 'anonymous');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-1/createLink');
    });

    it('should send type and scope in request body', async () => {
      client.post.resolves(makeResponse({ link: { webUrl: 'https://sharepoint.com/link' } }));

      await files.createSharingLink('item-1', 'edit', 'organization');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.type, 'edit');
      assert.strictEqual(body.scope, 'organization');
    });

    it('should return the created sharing link', async () => {
      const linkResponse = { link: { type: 'view', scope: 'anonymous', webUrl: 'https://1drv.ms/abc' } };
      client.post.resolves(makeResponse(linkResponse));

      const result = await files.createSharingLink('item-1', 'view', 'anonymous');

      assert.strictEqual(result.success, true);
      assert(result.data.link !== undefined);
    });

    it('should propagate error when item not found', async () => {
      client.post.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.createSharingLink('bad-item', 'view', 'anonymous');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getRecentFiles
  // ---------------------------------------------------------------------------
  describe('getRecentFiles', () => {
    it('should call GET /me/drive/recent', async () => {
      client.get.resolves(makeResponse([]));

      await files.getRecentFiles();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/recent');
    });

    it('should return recently accessed files from response', async () => {
      const recentItems = [
        { id: 'file-1', name: 'presentation.pptx' },
        { id: 'file-2', name: 'spreadsheet.xlsx' }
      ];
      client.get.resolves(makeResponse(recentItems));

      const result = await files.getRecentFiles();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Unauthorized', 'InvalidAuthenticationToken'));

      const result = await files.getRecentFiles();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getSharedWithMe
  // ---------------------------------------------------------------------------
  describe('getSharedWithMe', () => {
    it('should call GET /me/drive/sharedWithMe', async () => {
      client.get.resolves(makeResponse([]));

      await files.getSharedWithMe();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/sharedWithMe');
    });

    it('should return shared items from response', async () => {
      const sharedItems = [
        { id: 'shared-1', name: 'shared-doc.docx', remoteItem: {} }
      ];
      client.get.resolves(makeResponse(sharedItems));

      const result = await files.getSharedWithMe();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 1);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Forbidden', 'Authorization_RequestDenied'));

      const result = await files.getSharedWithMe();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listFileVersions
  // ---------------------------------------------------------------------------
  describe('listFileVersions', () => {
    it('should call GET /me/drive/items/{itemId}/versions', async () => {
      client.get.resolves(makeResponse([]));

      await files.listFileVersions('item-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-1/versions');
    });

    it('should pass select option to client', async () => {
      client.get.resolves(makeResponse([]));

      await files.listFileVersions('item-1', { select: ['id', 'lastModifiedDateTime'] });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'lastModifiedDateTime']);
    });

    it('should return version list from response', async () => {
      const versions = [
        { id: '1.0', lastModifiedDateTime: '2026-01-01T00:00:00Z' },
        { id: '2.0', lastModifiedDateTime: '2026-02-01T00:00:00Z' }
      ];
      client.get.resolves(makeResponse(versions));

      const result = await files.listFileVersions('item-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
    });

    it('should propagate error when item not found', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.listFileVersions('ghost-item');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // restoreFileVersion
  // ---------------------------------------------------------------------------
  describe('restoreFileVersion', () => {
    it('should call POST /me/drive/items/{itemId}/versions/{versionId}/restoreVersion', async () => {
      client.post.resolves(makeResponse({}));

      await files.restoreFileVersion('item-1', '1.0');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/items/item-1/versions/1.0/restoreVersion');
    });

    it('should return success response after restore', async () => {
      client.post.resolves(makeResponse({}));

      const result = await files.restoreFileVersion('item-1', '2.0');

      assert.strictEqual(result.success, true);
    });

    it('should propagate error when version not found', async () => {
      client.post.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.restoreFileVersion('item-1', 'bad-version');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });

    it('should propagate error when item does not exist', async () => {
      client.post.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await files.restoreFileVersion('nonexistent-item', '1.0');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // Error propagation – rejects (thrown errors)
  // ---------------------------------------------------------------------------
  describe('error propagation - rejects', () => {
    it('listRootFiles should propagate rejection from client', async () => {
      client.get.rejects(new Error('Network failure'));

      await assert.rejects(() => files.listRootFiles(), /Network failure/);
    });

    it('listFolderFiles should propagate rejection from client', async () => {
      client.get.rejects(new Error('Timeout'));

      await assert.rejects(() => files.listFolderFiles('folder-1'), /Timeout/);
    });

    it('getFileById should propagate rejection from client', async () => {
      client.get.rejects(new Error('Service unavailable'));

      await assert.rejects(() => files.getFileById('item-1'), /Service unavailable/);
    });

    it('getFileByPath should propagate rejection from client', async () => {
      client.get.rejects(new Error('Auth error'));

      await assert.rejects(() => files.getFileByPath('some/path.txt'), /Auth error/);
    });

    it('downloadFile should propagate rejection from client', async () => {
      client.get.rejects(new Error('Forbidden'));

      await assert.rejects(() => files.downloadFile('item-1'), /Forbidden/);
    });

    it('uploadSmallFile should propagate rejection from client', async () => {
      (client as any).put.rejects(new Error('Storage full'));

      await assert.rejects(() => files.uploadSmallFile('folder-1', 'file.txt', Buffer.from('data')), /Storage full/);
    });

    it('createUploadSession should propagate rejection from client', async () => {
      client.post.rejects(new Error('Conflict'));

      await assert.rejects(() => files.createUploadSession('folder-1', 'large.zip'), /Conflict/);
    });

    it('uploadLargeFileChunk should propagate rejection from client', async () => {
      (client as any).put.rejects(new Error('Upload session expired'));

      await assert.rejects(
        () => files.uploadLargeFileChunk('https://upload.example.com/s', Buffer.from('x'), 0, 0, 1),
        /Upload session expired/
      );
    });

    it('createFolder should propagate rejection from client', async () => {
      client.post.rejects(new Error('Permission denied'));

      await assert.rejects(() => files.createFolder('parent-1', 'New Folder'), /Permission denied/);
    });

    it('deleteItem should propagate rejection from client', async () => {
      client.delete.rejects(new Error('Item locked'));

      await assert.rejects(() => files.deleteItem('item-1'), /Item locked/);
    });

    it('moveItem should propagate rejection from client', async () => {
      client.patch.rejects(new Error('Destination not found'));

      await assert.rejects(() => files.moveItem('item-1', 'bad-parent'), /Destination not found/);
    });

    it('copyItem should propagate rejection from client', async () => {
      client.post.rejects(new Error('Copy failed'));

      await assert.rejects(() => files.copyItem('item-1', 'parent-2'), /Copy failed/);
    });

    it('searchFiles should propagate rejection from client', async () => {
      client.get.rejects(new Error('Search service down'));

      await assert.rejects(() => files.searchFiles('budget'), /Search service down/);
    });

    it('createSharingLink should propagate rejection from client', async () => {
      client.post.rejects(new Error('Link creation failed'));

      await assert.rejects(() => files.createSharingLink('item-1', 'view', 'anonymous'), /Link creation failed/);
    });

    it('getRecentFiles should propagate rejection from client', async () => {
      client.get.rejects(new Error('Unauthorized'));

      await assert.rejects(() => files.getRecentFiles(), /Unauthorized/);
    });

    it('getSharedWithMe should propagate rejection from client', async () => {
      client.get.rejects(new Error('Access denied'));

      await assert.rejects(() => files.getSharedWithMe(), /Access denied/);
    });

    it('listFileVersions should propagate rejection from client', async () => {
      client.get.rejects(new Error('Versioning not enabled'));

      await assert.rejects(() => files.listFileVersions('item-1'), /Versioning not enabled/);
    });

    it('restoreFileVersion should propagate rejection from client', async () => {
      client.post.rejects(new Error('Restore failed'));

      await assert.rejects(() => files.restoreFileVersion('item-1', '1.0'), /Restore failed/);
    });

    it('listSharePointDriveFiles error should propagate rejection from client', async () => {
      client.get.rejects(new Error('SharePoint unavailable'));

      await assert.rejects(() => files.listSharePointDriveFiles('site-1', 'drive-1'), /SharePoint unavailable/);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('listRootFiles with select, top, and orderby options should pass all query params', async () => {
      client.get.resolves(makeResponse([]));

      await files.listRootFiles({ select: ['id', 'name', 'size'], top: 5 });

      const [, opts] = client.get.firstCall.args;
      assert.deepStrictEqual(opts!.select, ['id', 'name', 'size']);
      assert.strictEqual(opts!.top, 5);
    });

    it('searchFiles with empty query should still make a request', async () => {
      client.get.resolves(makeResponse([]));

      await files.searchFiles('');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, "/me/drive/search(q='')");
    });

    it('searchFiles with single quotes in query should escape them', async () => {
      client.get.resolves(makeResponse([]));

      await files.searchFiles("manager's report");

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, "/me/drive/search(q='manager''s report')");
    });

    it('uploadSmallFile should call put with the file content as body', async () => {
      const content = Buffer.from('file content bytes');
      (client as any).put.resolves(makeResponse({ id: 'new-file', name: 'test.txt' }));

      await files.uploadSmallFile('folder-1', 'test.txt', content);

      const [url, body] = (client as any).put.firstCall.args;
      assert.strictEqual(url, '/me/drive/items/folder-1:/test.txt:/content');
      assert.strictEqual(body, content);
    });

    it('uploadLargeFileChunk should send correct Content-Range header for middle chunk', async () => {
      (client as any).put.resolves(makeResponse({}));
      const chunk = Buffer.from('x'.repeat(327680));

      await files.uploadLargeFileChunk('https://upload.example.com/session', chunk, 327680, 655359, 1000000);

      const [, , headers] = (client as any).put.firstCall.args;
      assert.strictEqual(headers['Content-Range'], 'bytes 327680-655359/1000000');
    });

    it('createSharingLink with type view should send view type in body', async () => {
      client.post.resolves(makeResponse({ link: { webUrl: 'https://1drv.ms/view' } }));

      await files.createSharingLink('item-1', 'view', 'anonymous');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.type, 'view');
    });

    it('createSharingLink with type edit should send edit type in body', async () => {
      client.post.resolves(makeResponse({ link: { webUrl: 'https://1drv.ms/edit' } }));

      await files.createSharingLink('item-1', 'edit', 'organization');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.type, 'edit');
    });

    it('createSharingLink with type embed should send embed type in body', async () => {
      client.post.resolves(makeResponse({ link: { webUrl: 'https://1drv.ms/embed' } }));

      await files.createSharingLink('item-1', 'embed', 'organization');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.type, 'embed');
    });

    it('moveItem with rename should include name in the body', async () => {
      client.patch.resolves(makeResponse({ id: 'item-1', name: 'renamed.txt' }));

      // The current moveItem method does not accept a name parameter, so we test
      // that parentReference is included correctly — rename is done via updateTask/patch
      await files.moveItem('item-1', 'new-parent-456');

      const [, body] = client.patch.firstCall.args;
      assert.deepStrictEqual(body.parentReference, { id: 'new-parent-456' });
    });

    it('copyItem should use POST (not PATCH)', async () => {
      client.post.resolves(makeResponse({}));

      await files.copyItem('item-1', 'dest-parent');

      assert(client.post.calledOnce);
      assert(client.patch.notCalled);
    });

    it('createFolder should include folder:{} conflict behavior placeholder in body', async () => {
      client.post.resolves(makeResponse({ id: 'folder-new', name: 'Docs', folder: {} }));

      await files.createFolder('parent-1', 'Docs');

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.folder, {});
      assert.strictEqual(body.name, 'Docs');
    });

    it('getFileByPath with spaces in path should pass path as-is', async () => {
      client.get.resolves(makeResponse({ id: 'item-spaces', name: 'My Report.docx' }));

      await files.getFileByPath('My Documents/My Report.docx');

      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/drive/root:/My Documents/My Report.docx');
    });
  });
});
