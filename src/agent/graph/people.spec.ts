import assert from 'assert';
import sinon from 'sinon';
import { sinonUtil } from '../../utils/sinonUtil.js';
import { GraphClient } from '../graph-client.js';
import { PeopleOperations } from './people.js';

describe('PeopleOperations', () => {
  let client: sinon.SinonStubbedInstance<GraphClient>;
  let people: PeopleOperations;

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

  function makeVoidResponse(): { success: boolean; data: void; tokenEstimate: number } {
    return {
      success: true,
      data: undefined as unknown as void,
      tokenEstimate: 0
    };
  }

  const samplePerson = {
    id: 'person-1',
    displayName: 'Alice Johnson',
    userPrincipalName: 'alice@contoso.com',
    emailAddresses: [{ address: 'alice@contoso.com', name: 'Alice Johnson' }],
    jobTitle: 'Software Engineer',
    companyName: 'Contoso'
  };

  const sampleContact = {
    id: 'contact-1',
    givenName: 'Bob',
    surname: 'Smith',
    emailAddresses: [{ address: 'bob@contoso.com', name: 'Bob Smith' }],
    businessPhones: ['+1 555 0100'],
    jobTitle: 'Manager',
    companyName: 'Contoso'
  };

  const sampleUser = {
    id: 'user-1',
    displayName: 'Carol White',
    userPrincipalName: 'carol@contoso.com',
    jobTitle: 'Director',
    companyName: 'Contoso'
  };

  beforeEach(() => {
    client = sinon.createStubInstance(GraphClient);
    people = new PeopleOperations(client as any);
  });

  afterEach(() => {
    sinonUtil.restore([]);
    sinon.restore();
  });

  // ---------------------------------------------------------------------------
  // listRelevantPeople
  // ---------------------------------------------------------------------------
  describe('listRelevantPeople', () => {
    it('should call GET /me/people', async () => {
      client.get.resolves(makeResponse([samplePerson]));

      await people.listRelevantPeople();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/people');
    });

    it('should return people array on success', async () => {
      client.get.resolves(makeResponse([samplePerson]));

      const result = await people.listRelevantPeople();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 1);
    });

    it('should pass top option when provided', async () => {
      client.get.resolves(makeResponse([]));

      await people.listRelevantPeople({ top: 10 });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.top, 10);
    });

    it('should return empty array when no relevant people are found', async () => {
      client.get.resolves(makeResponse([]));

      const result = await people.listRelevantPeople();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Unauthorized', 'InvalidAuthenticationToken'));

      const result = await people.listRelevantPeople();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // searchPeople
  // ---------------------------------------------------------------------------
  describe('searchPeople', () => {
    it('should call GET /me/people with $search query param', async () => {
      client.get.resolves(makeResponse([samplePerson]));

      await people.searchPeople('Alice');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/people');
    });

    it('should include $search parameter with the query string', async () => {
      client.get.resolves(makeResponse([samplePerson]));

      await people.searchPeople('Alice');

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert((opts as any).search !== undefined || (opts as any).$search !== undefined || JSON.stringify(opts).includes('Alice'));
    });

    it('should return matched people on success', async () => {
      client.get.resolves(makeResponse([samplePerson]));

      const result = await people.searchPeople('Alice');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].displayName, 'Alice Johnson');
    });

    it('should pass top option when provided', async () => {
      client.get.resolves(makeResponse([]));

      await people.searchPeople('test', { top: 5 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 5);
    });

    it('should return empty array when no people match the search', async () => {
      client.get.resolves(makeResponse([]));

      const result = await people.searchPeople('nonexistent-xyz');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Service unavailable', 'ServiceUnavailable'));

      const result = await people.searchPeople('Alice');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // listContacts
  // ---------------------------------------------------------------------------
  describe('listContacts', () => {
    it('should call GET /me/contacts', async () => {
      client.get.resolves(makeResponse([sampleContact]));

      await people.listContacts();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/contacts');
    });

    it('should return contacts array on success', async () => {
      client.get.resolves(makeResponse([sampleContact]));

      const result = await people.listContacts();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 1);
    });

    it('should pass top option when provided', async () => {
      client.get.resolves(makeResponse([]));

      await people.listContacts({ top: 20 });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.top, 20);
    });

    it('should return empty array when no contacts exist', async () => {
      client.get.resolves(makeResponse([]));

      const result = await people.listContacts();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Forbidden', 'Authorization_RequestDenied'));

      const result = await people.listContacts();

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getContact
  // ---------------------------------------------------------------------------
  describe('getContact', () => {
    it('should call GET /me/contacts/{contactId}', async () => {
      client.get.resolves(makeResponse(sampleContact));

      await people.getContact('contact-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/contacts/contact-1');
    });

    it('should return contact data on success', async () => {
      client.get.resolves(makeResponse(sampleContact));

      const result = await people.getContact('contact-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'contact-1');
      assert.strictEqual(result.data.givenName, 'Bob');
    });

    it('should propagate not-found error', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await people.getContact('nonexistent-contact');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // createContact
  // ---------------------------------------------------------------------------
  describe('createContact', () => {
    it('should call POST /me/contacts', async () => {
      client.post.resolves(makeResponse(sampleContact));

      await people.createContact({
        givenName: 'Bob',
        surname: 'Smith',
        emailAddresses: [{ address: 'bob@contoso.com', name: 'Bob Smith' }]
      });

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/contacts');
    });

    it('should include givenName and surname in the request body', async () => {
      client.post.resolves(makeResponse(sampleContact));

      await people.createContact({ givenName: 'Bob', surname: 'Smith' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.givenName, 'Bob');
      assert.strictEqual(body.surname, 'Smith');
    });

    it('should include emailAddresses in the request body when provided', async () => {
      client.post.resolves(makeResponse(sampleContact));

      const emailAddresses = [{ address: 'bob@contoso.com', name: 'Bob Smith' }];
      await people.createContact({ givenName: 'Bob', emailAddresses });

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.emailAddresses, emailAddresses);
    });

    it('should include businessPhones in the request body when provided', async () => {
      client.post.resolves(makeResponse(sampleContact));

      await people.createContact({ givenName: 'Bob', businessPhones: ['+1 555 0100'] });

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.businessPhones, ['+1 555 0100']);
    });

    it('should include jobTitle and companyName in the request body when provided', async () => {
      client.post.resolves(makeResponse(sampleContact));

      await people.createContact({ givenName: 'Bob', jobTitle: 'Manager', companyName: 'Contoso' });

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.jobTitle, 'Manager');
      assert.strictEqual(body.companyName, 'Contoso');
    });

    it('should return created contact on success', async () => {
      client.post.resolves(makeResponse(sampleContact));

      const result = await people.createContact({ givenName: 'Bob', surname: 'Smith' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'contact-1');
    });

    it('should propagate error response', async () => {
      client.post.resolves(makeErrorResponse('Bad request', 'BadRequest'));

      const result = await people.createContact({ givenName: 'Bob' });

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // updateContact
  // ---------------------------------------------------------------------------
  describe('updateContact', () => {
    it('should call PATCH /me/contacts/{contactId}', async () => {
      client.patch.resolves(makeResponse({ ...sampleContact, jobTitle: 'Senior Manager' }));

      await people.updateContact('contact-1', { jobTitle: 'Senior Manager' });

      assert(client.patch.calledOnce);
      const [endpoint] = client.patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/contacts/contact-1');
    });

    it('should include updates in the request body', async () => {
      client.patch.resolves(makeResponse(sampleContact));

      await people.updateContact('contact-1', { jobTitle: 'Director', companyName: 'Fabrikam' });

      const [, body] = client.patch.firstCall.args;
      assert.strictEqual(body.jobTitle, 'Director');
      assert.strictEqual(body.companyName, 'Fabrikam');
    });

    it('should return updated contact on success', async () => {
      const updatedContact = { ...sampleContact, jobTitle: 'VP Engineering' };
      client.patch.resolves(makeResponse(updatedContact));

      const result = await people.updateContact('contact-1', { jobTitle: 'VP Engineering' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.jobTitle, 'VP Engineering');
    });

    it('should propagate not-found error', async () => {
      client.patch.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await people.updateContact('nonexistent-contact', { jobTitle: 'Test' });

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteContact
  // ---------------------------------------------------------------------------
  describe('deleteContact', () => {
    it('should call DELETE /me/contacts/{contactId}', async () => {
      client.delete.resolves(makeVoidResponse());

      await people.deleteContact('contact-1');

      assert(client.delete.calledOnce);
      const [endpoint] = client.delete.firstCall.args;
      assert.strictEqual(endpoint, '/me/contacts/contact-1');
    });

    it('should return success on deletion', async () => {
      client.delete.resolves(makeVoidResponse());

      const result = await people.deleteContact('contact-1');

      assert.strictEqual(result.success, true);
    });

    it('should propagate not-found error', async () => {
      client.delete.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await people.deleteContact('nonexistent-contact');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserProfile
  // ---------------------------------------------------------------------------
  describe('getUserProfile', () => {
    it('should call GET /users/{idOrUpn} with user id', async () => {
      client.get.resolves(makeResponse(sampleUser));

      await people.getUserProfile('user-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/user-1');
    });

    it('should call GET /users/{idOrUpn} with UPN', async () => {
      client.get.resolves(makeResponse(sampleUser));

      await people.getUserProfile('carol@contoso.com');

      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/carol@contoso.com');
    });

    it('should return user profile data on success', async () => {
      client.get.resolves(makeResponse(sampleUser));

      const result = await people.getUserProfile('user-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'user-1');
      assert.strictEqual(result.data.displayName, 'Carol White');
    });

    it('should propagate not-found error', async () => {
      client.get.resolves(makeErrorResponse('Resource not found', 'Request_ResourceNotFound'));

      const result = await people.getUserProfile('nonexistent@contoso.com');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // searchUsers
  // ---------------------------------------------------------------------------
  describe('searchUsers', () => {
    it('should call GET /users', async () => {
      client.get.resolves(makeResponse([sampleUser]));

      await people.searchUsers('Carol');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users');
    });

    it('should include $filter with startsWith on displayName', async () => {
      client.get.resolves(makeResponse([sampleUser]));

      await people.searchUsers('Carol');

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      const filter = opts!.filter as string;
      assert(filter !== undefined, 'Expected filter to be set');
      assert(filter.includes('Carol'), `Expected filter to contain query: ${filter}`);
      assert(filter.includes('startsWith'), `Expected filter to use startsWith: ${filter}`);
      assert(filter.includes('displayName'), `Expected filter to target displayName: ${filter}`);
    });

    it('should return matched users on success', async () => {
      client.get.resolves(makeResponse([sampleUser]));

      const result = await people.searchUsers('Carol');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].displayName, 'Carol White');
    });

    it('should pass top option when provided', async () => {
      client.get.resolves(makeResponse([]));

      await people.searchUsers('test', { top: 15 });

      const [, opts] = client.get.firstCall.args;
      assert.strictEqual(opts!.top, 15);
    });

    it('should return empty array when no users match', async () => {
      client.get.resolves(makeResponse([]));

      const result = await people.searchUsers('zzz-nonexistent');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Forbidden', 'Authorization_RequestDenied'));

      const result = await people.searchUsers('Carol');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserManager
  // ---------------------------------------------------------------------------
  describe('getUserManager', () => {
    it('should call GET /users/{idOrUpn}/manager', async () => {
      const manager = { id: 'mgr-1', displayName: 'Dave Boss', userPrincipalName: 'dave@contoso.com' };
      client.get.resolves(makeResponse(manager));

      await people.getUserManager('user-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/user-1/manager');
    });

    it('should return manager data on success', async () => {
      const manager = { id: 'mgr-1', displayName: 'Dave Boss' };
      client.get.resolves(makeResponse(manager));

      const result = await people.getUserManager('user-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.displayName, 'Dave Boss');
    });

    it('should propagate error when user has no manager', async () => {
      client.get.resolves(makeErrorResponse('Resource not found', 'Request_ResourceNotFound'));

      const result = await people.getUserManager('user-without-manager');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserDirectReports
  // ---------------------------------------------------------------------------
  describe('getUserDirectReports', () => {
    it('should call GET /users/{idOrUpn}/directReports', async () => {
      client.get.resolves(makeResponse([sampleUser]));

      await people.getUserDirectReports('mgr-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/mgr-1/directReports');
    });

    it('should return direct reports array on success', async () => {
      const reports = [
        { id: 'user-1', displayName: 'Carol White' },
        { id: 'user-2', displayName: 'Eve Green' }
      ];
      client.get.resolves(makeResponse(reports));

      const result = await people.getUserDirectReports('mgr-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 2);
    });

    it('should return empty array when user has no direct reports', async () => {
      client.get.resolves(makeResponse([]));

      const result = await people.getUserDirectReports('user-no-reports');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });

    it('should propagate error response', async () => {
      client.get.resolves(makeErrorResponse('Resource not found', 'Request_ResourceNotFound'));

      const result = await people.getUserDirectReports('nonexistent-user');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserPhoto
  // ---------------------------------------------------------------------------
  describe('getUserPhoto', () => {
    it('should call GET /users/{idOrUpn}/photo/$value when no size specified', async () => {
      client.get.resolves(makeResponse(Buffer.from('photo-data')));

      await people.getUserPhoto('user-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/user-1/photo/$value');
    });

    it('should call GET /users/{idOrUpn}/photos/{size}/$value when size is specified', async () => {
      client.get.resolves(makeResponse(Buffer.from('photo-data')));

      await people.getUserPhoto('user-1', '48x48');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/user-1/photos/48x48/$value');
    });

    it('should support different photo sizes', async () => {
      client.get.resolves(makeResponse(Buffer.from('photo-data')));

      await people.getUserPhoto('carol@contoso.com', '240x240');

      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/users/carol@contoso.com/photos/240x240/$value');
    });

    it('should return photo data on success', async () => {
      const photoData = Buffer.from('binary-photo-content');
      client.get.resolves(makeResponse(photoData));

      const result = await people.getUserPhoto('user-1');

      assert.strictEqual(result.success, true);
      assert(result.data !== undefined);
    });

    it('should propagate not-found error when user has no photo', async () => {
      client.get.resolves(makeErrorResponse('Item not found', 'ErrorItemNotFound'));

      const result = await people.getUserPhoto('user-no-photo');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
    });
  });
});
