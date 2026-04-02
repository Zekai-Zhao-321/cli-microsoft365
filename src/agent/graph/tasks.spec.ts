import assert from 'assert';
import sinon from 'sinon';
import { sinonUtil } from '../../utils/sinonUtil.js';
import { GraphClient } from '../graph-client.js';
import { TasksOperations } from './tasks.js';

describe('TasksOperations', () => {
  let client: sinon.SinonStubbedInstance<GraphClient>;
  let tasks: TasksOperations;

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

  function makeVoidResponse(): { success: boolean; data: any; tokenEstimate: number } {
    return {
      success: true,
      data: {},
      tokenEstimate: 0
    };
  }

  const sampleTaskList = {
    id: 'list-1',
    displayName: 'My Tasks',
    isOwner: true,
    isShared: false,
    wellknownListName: 'defaultList'
  };

  const sampleTask = {
    id: 'task-1',
    title: 'Finish report',
    status: 'notStarted',
    importance: 'normal',
    dueDateTime: { dateTime: '2026-04-10T00:00:00', timeZone: 'UTC' }
  };

  const samplePlan = {
    id: 'plan-1',
    title: 'Sprint Plan',
    owner: 'group-1',
    createdDateTime: '2026-01-01T00:00:00Z'
  };

  const sampleBucket = {
    id: 'bucket-1',
    name: 'Backlog',
    planId: 'plan-1',
    orderHint: '8585634710!!',
    taskCount: 3
  };

  const samplePlannerTask = {
    id: 'ptask-1',
    planId: 'plan-1',
    bucketId: 'bucket-1',
    title: 'Design mockup',
    percentComplete: 0,
    assignments: {}
  };

  beforeEach(() => {
    client = sinon.createStubInstance(GraphClient);
    // Planner PATCH/DELETE require If-Match headers; extend the stub to accept headers as a third arg
    (client as any).patch = sinon.stub();
    (client as any).delete = sinon.stub();
    tasks = new TasksOperations(client as any);
  });

  afterEach(() => {
    sinonUtil.restore([]);
    sinon.restore();
  });

  // ---------------------------------------------------------------------------
  // listTaskLists
  // ---------------------------------------------------------------------------
  describe('listTaskLists', () => {
    it('should GET /me/todo/lists', async () => {
      client.get.resolves(makeResponse([sampleTaskList]));

      await tasks.listTaskLists();

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists');
    });

    it('should return task lists array on success', async () => {
      client.get.resolves(makeResponse([sampleTaskList]));

      const result = await tasks.listTaskLists();

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].id, 'list-1');
    });

    it('should return empty array when no task lists exist', async () => {
      client.get.resolves(makeResponse([]));

      const result = await tasks.listTaskLists();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getTaskList
  // ---------------------------------------------------------------------------
  describe('getTaskList', () => {
    it('should GET /me/todo/lists/{listId}', async () => {
      client.get.resolves(makeResponse(sampleTaskList));

      await tasks.getTaskList('list-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists/list-1');
    });

    it('should return the task list on success', async () => {
      client.get.resolves(makeResponse(sampleTaskList));

      const result = await tasks.getTaskList('list-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'list-1');
      assert.strictEqual(result.data.displayName, 'My Tasks');
    });

    it('should return success=false on 404', async () => {
      client.get.resolves(makeErrorResponse('The specified object was not found.', 'ErrorItemNotFound'));

      const result = await tasks.getTaskList('non-existent');

      assert.strictEqual(result.success, false);
      assert(result.error !== undefined);
      assert.strictEqual(result.error!.code, 'ErrorItemNotFound');
    });
  });

  // ---------------------------------------------------------------------------
  // createTaskList
  // ---------------------------------------------------------------------------
  describe('createTaskList', () => {
    it('should POST to /me/todo/lists', async () => {
      client.post.resolves(makeResponse({ ...sampleTaskList, id: 'list-new', displayName: 'Work Tasks' }));

      await tasks.createTaskList('Work Tasks');

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists');
    });

    it('should send displayName in the POST body', async () => {
      client.post.resolves(makeResponse({ ...sampleTaskList, id: 'list-new', displayName: 'Work Tasks' }));

      await tasks.createTaskList('Work Tasks');

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.displayName, 'Work Tasks');
    });

    it('should return the newly created task list on success', async () => {
      client.post.resolves(makeResponse({ ...sampleTaskList, id: 'list-new', displayName: 'Work Tasks' }));

      const result = await tasks.createTaskList('Work Tasks');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.displayName, 'Work Tasks');
    });
  });

  // ---------------------------------------------------------------------------
  // listTasks
  // ---------------------------------------------------------------------------
  describe('listTasks', () => {
    it('should GET /me/todo/lists/{listId}/tasks', async () => {
      client.get.resolves(makeResponse([sampleTask]));

      await tasks.listTasks('list-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists/list-1/tasks');
    });

    it('should return tasks array on success', async () => {
      client.get.resolves(makeResponse([sampleTask]));

      const result = await tasks.listTasks('list-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'task-1');
    });

    it('should pass optional query options to the client', async () => {
      client.get.resolves(makeResponse([]));

      await tasks.listTasks('list-1', { top: 10 });

      const [, opts] = client.get.firstCall.args;
      assert(opts !== undefined);
      assert.strictEqual(opts!.top, 10);
    });

    it('should return empty array when list has no tasks', async () => {
      client.get.resolves(makeResponse([]));

      const result = await tasks.listTasks('list-1');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getTask
  // ---------------------------------------------------------------------------
  describe('getTask', () => {
    it('should GET /me/todo/lists/{listId}/tasks/{taskId}', async () => {
      client.get.resolves(makeResponse(sampleTask));

      await tasks.getTask('list-1', 'task-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists/list-1/tasks/task-1');
    });

    it('should return the task data on success', async () => {
      client.get.resolves(makeResponse(sampleTask));

      const result = await tasks.getTask('list-1', 'task-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'task-1');
      assert.strictEqual(result.data.title, 'Finish report');
    });
  });

  // ---------------------------------------------------------------------------
  // createTask
  // ---------------------------------------------------------------------------
  describe('createTask', () => {
    const taskParams = {
      title: 'New task',
      body: { content: 'Details here', contentType: 'text' },
      dueDateTime: { dateTime: '2026-04-15T00:00:00', timeZone: 'UTC' },
      importance: 'high',
      reminderDateTime: { dateTime: '2026-04-14T09:00:00', timeZone: 'UTC' }
    };

    it('should POST to /me/todo/lists/{listId}/tasks', async () => {
      client.post.resolves(makeResponse({ ...sampleTask, id: 'task-new', title: 'New task' }));

      await tasks.createTask('list-1', taskParams);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists/list-1/tasks');
    });

    it('should include title in the POST body', async () => {
      client.post.resolves(makeResponse({ ...sampleTask, id: 'task-new', title: 'New task' }));

      await tasks.createTask('list-1', taskParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.title, 'New task');
    });

    it('should include body, dueDateTime, importance, and reminderDateTime in the POST body', async () => {
      client.post.resolves(makeResponse({ ...sampleTask, id: 'task-new', title: 'New task' }));

      await tasks.createTask('list-1', taskParams);

      const [, body] = client.post.firstCall.args;
      assert.deepStrictEqual(body.body, taskParams.body);
      assert.deepStrictEqual(body.dueDateTime, taskParams.dueDateTime);
      assert.strictEqual(body.importance, 'high');
      assert.deepStrictEqual(body.reminderDateTime, taskParams.reminderDateTime);
    });

    it('should return the created task on success', async () => {
      client.post.resolves(makeResponse({ ...sampleTask, id: 'task-new', title: 'New task' }));

      const result = await tasks.createTask('list-1', taskParams);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.title, 'New task');
    });
  });

  // ---------------------------------------------------------------------------
  // updateTask
  // ---------------------------------------------------------------------------
  describe('updateTask', () => {
    it('should PATCH /me/todo/lists/{listId}/tasks/{taskId}', async () => {
      (client as any).patch.resolves(makeResponse({ ...sampleTask, title: 'Updated task' }));

      await tasks.updateTask('list-1', 'task-1', { title: 'Updated task' });

      assert((client as any).patch.calledOnce);
      const [endpoint] = (client as any).patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists/list-1/tasks/task-1');
    });

    it('should pass updates in the PATCH body', async () => {
      (client as any).patch.resolves(makeResponse({ ...sampleTask, importance: 'high' }));

      await tasks.updateTask('list-1', 'task-1', { importance: 'high' });

      const [, body] = (client as any).patch.firstCall.args;
      assert.strictEqual(body.importance, 'high');
    });

    it('should return updated task on success', async () => {
      (client as any).patch.resolves(makeResponse({ ...sampleTask, title: 'Updated task' }));

      const result = await tasks.updateTask('list-1', 'task-1', { title: 'Updated task' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.title, 'Updated task');
    });
  });

  // ---------------------------------------------------------------------------
  // completeTask
  // ---------------------------------------------------------------------------
  describe('completeTask', () => {
    it('should PATCH /me/todo/lists/{listId}/tasks/{taskId}', async () => {
      (client as any).patch.resolves(makeResponse({ ...sampleTask, status: 'completed' }));

      await tasks.completeTask('list-1', 'task-1');

      assert((client as any).patch.calledOnce);
      const [endpoint] = (client as any).patch.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists/list-1/tasks/task-1');
    });

    it('should send { status: "completed" } in the PATCH body', async () => {
      (client as any).patch.resolves(makeResponse({ ...sampleTask, status: 'completed' }));

      await tasks.completeTask('list-1', 'task-1');

      const [, body] = (client as any).patch.firstCall.args;
      assert.strictEqual(body.status, 'completed');
    });

    it('should return the completed task on success', async () => {
      (client as any).patch.resolves(makeResponse({ ...sampleTask, status: 'completed' }));

      const result = await tasks.completeTask('list-1', 'task-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.status, 'completed');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteTask
  // ---------------------------------------------------------------------------
  describe('deleteTask', () => {
    it('should DELETE /me/todo/lists/{listId}/tasks/{taskId}', async () => {
      (client as any).delete.resolves(makeVoidResponse());

      await tasks.deleteTask('list-1', 'task-1');

      assert((client as any).delete.calledOnce);
      const [endpoint] = (client as any).delete.firstCall.args;
      assert.strictEqual(endpoint, '/me/todo/lists/list-1/tasks/task-1');
    });

    it('should return success=true on successful deletion', async () => {
      (client as any).delete.resolves(makeVoidResponse());

      const result = await tasks.deleteTask('list-1', 'task-1');

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // listPlansForGroup
  // ---------------------------------------------------------------------------
  describe('listPlansForGroup', () => {
    it('should GET /groups/{groupId}/planner/plans', async () => {
      client.get.resolves(makeResponse([samplePlan]));

      await tasks.listPlansForGroup('group-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/groups/group-1/planner/plans');
    });

    it('should return plans array on success', async () => {
      client.get.resolves(makeResponse([samplePlan]));

      const result = await tasks.listPlansForGroup('group-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'plan-1');
    });

    it('should return empty array when group has no plans', async () => {
      client.get.resolves(makeResponse([]));

      const result = await tasks.listPlansForGroup('group-1');

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getPlan
  // ---------------------------------------------------------------------------
  describe('getPlan', () => {
    it('should GET /planner/plans/{planId}', async () => {
      client.get.resolves(makeResponse(samplePlan));

      await tasks.getPlan('plan-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/planner/plans/plan-1');
    });

    it('should return plan data on success', async () => {
      client.get.resolves(makeResponse(samplePlan));

      const result = await tasks.getPlan('plan-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'plan-1');
      assert.strictEqual(result.data.title, 'Sprint Plan');
    });
  });

  // ---------------------------------------------------------------------------
  // listBuckets
  // ---------------------------------------------------------------------------
  describe('listBuckets', () => {
    it('should GET /planner/plans/{planId}/buckets', async () => {
      client.get.resolves(makeResponse([sampleBucket]));

      await tasks.listBuckets('plan-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/planner/plans/plan-1/buckets');
    });

    it('should return buckets array on success', async () => {
      client.get.resolves(makeResponse([sampleBucket]));

      const result = await tasks.listBuckets('plan-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'bucket-1');
    });
  });

  // ---------------------------------------------------------------------------
  // listTasksInPlan
  // ---------------------------------------------------------------------------
  describe('listTasksInPlan', () => {
    it('should GET /planner/plans/{planId}/tasks', async () => {
      client.get.resolves(makeResponse([samplePlannerTask]));

      await tasks.listTasksInPlan('plan-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/planner/plans/plan-1/tasks');
    });

    it('should return planner tasks array on success', async () => {
      client.get.resolves(makeResponse([samplePlannerTask]));

      const result = await tasks.listTasksInPlan('plan-1');

      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data));
      assert.strictEqual(result.data[0].id, 'ptask-1');
    });
  });

  // ---------------------------------------------------------------------------
  // getPlannerTask
  // ---------------------------------------------------------------------------
  describe('getPlannerTask', () => {
    it('should GET /planner/tasks/{taskId}', async () => {
      client.get.resolves(makeResponse(samplePlannerTask));

      await tasks.getPlannerTask('ptask-1');

      assert(client.get.calledOnce);
      const [endpoint] = client.get.firstCall.args;
      assert.strictEqual(endpoint, '/planner/tasks/ptask-1');
    });

    it('should return planner task data on success', async () => {
      client.get.resolves(makeResponse(samplePlannerTask));

      const result = await tasks.getPlannerTask('ptask-1');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.id, 'ptask-1');
      assert.strictEqual(result.data.title, 'Design mockup');
    });
  });

  // ---------------------------------------------------------------------------
  // createPlannerTask
  // ---------------------------------------------------------------------------
  describe('createPlannerTask', () => {
    const plannerTaskParams = {
      planId: 'plan-1',
      bucketId: 'bucket-1',
      title: 'New planner task',
      dueDateTime: '2026-04-20T00:00:00Z',
      assignments: { 'user-1': { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' } }
    };

    it('should POST to /planner/tasks', async () => {
      client.post.resolves(makeResponse({ ...samplePlannerTask, id: 'ptask-new', title: 'New planner task' }));

      await tasks.createPlannerTask(plannerTaskParams);

      assert(client.post.calledOnce);
      const [endpoint] = client.post.firstCall.args;
      assert.strictEqual(endpoint, '/planner/tasks');
    });

    it('should include planId, bucketId, and title in the POST body', async () => {
      client.post.resolves(makeResponse({ ...samplePlannerTask, id: 'ptask-new', title: 'New planner task' }));

      await tasks.createPlannerTask(plannerTaskParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.planId, 'plan-1');
      assert.strictEqual(body.bucketId, 'bucket-1');
      assert.strictEqual(body.title, 'New planner task');
    });

    it('should include dueDateTime and assignments in the POST body', async () => {
      client.post.resolves(makeResponse({ ...samplePlannerTask, id: 'ptask-new' }));

      await tasks.createPlannerTask(plannerTaskParams);

      const [, body] = client.post.firstCall.args;
      assert.strictEqual(body.dueDateTime, '2026-04-20T00:00:00Z');
      assert.deepStrictEqual(body.assignments, plannerTaskParams.assignments);
    });

    it('should return the created planner task on success', async () => {
      client.post.resolves(makeResponse({ ...samplePlannerTask, id: 'ptask-new', title: 'New planner task' }));

      const result = await tasks.createPlannerTask(plannerTaskParams);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.title, 'New planner task');
    });
  });

  // ---------------------------------------------------------------------------
  // updatePlannerTask
  // ---------------------------------------------------------------------------
  describe('updatePlannerTask', () => {
    const etag = 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="';

    it('should PATCH /planner/tasks/{taskId}', async () => {
      (client as any).patch.resolves(makeResponse({ ...samplePlannerTask, title: 'Updated planner task' }));

      await tasks.updatePlannerTask('ptask-1', { title: 'Updated planner task' }, etag);

      assert((client as any).patch.calledOnce);
      const [endpoint] = (client as any).patch.firstCall.args;
      assert.strictEqual(endpoint, '/planner/tasks/ptask-1');
    });

    it('should send updates in the PATCH body', async () => {
      (client as any).patch.resolves(makeResponse({ ...samplePlannerTask, title: 'Updated planner task' }));

      await tasks.updatePlannerTask('ptask-1', { title: 'Updated planner task' }, etag);

      const [, body] = (client as any).patch.firstCall.args;
      assert.strictEqual(body.title, 'Updated planner task');
    });

    it('should pass the If-Match header with the etag', async () => {
      (client as any).patch.resolves(makeResponse({ ...samplePlannerTask }));

      await tasks.updatePlannerTask('ptask-1', { percentComplete: 50 }, etag);

      const [, , headers] = (client as any).patch.firstCall.args;
      assert(headers !== undefined, 'Expected headers to be passed as third argument');
      assert.strictEqual(headers['If-Match'], etag);
    });

    it('should return the updated planner task on success', async () => {
      (client as any).patch.resolves(makeResponse({ ...samplePlannerTask, title: 'Updated planner task' }));

      const result = await tasks.updatePlannerTask('ptask-1', { title: 'Updated planner task' }, etag);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.title, 'Updated planner task');
    });
  });

  // ---------------------------------------------------------------------------
  // deletePlannerTask
  // ---------------------------------------------------------------------------
  describe('deletePlannerTask', () => {
    const etag = 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="';

    it('should DELETE /planner/tasks/{taskId}', async () => {
      (client as any).delete.resolves(makeVoidResponse());

      await tasks.deletePlannerTask('ptask-1', etag);

      assert((client as any).delete.calledOnce);
      const [endpoint] = (client as any).delete.firstCall.args;
      assert.strictEqual(endpoint, '/planner/tasks/ptask-1');
    });

    it('should pass the If-Match header with the etag', async () => {
      (client as any).delete.resolves(makeVoidResponse());

      await tasks.deletePlannerTask('ptask-1', etag);

      const [, headers] = (client as any).delete.firstCall.args;
      assert(headers !== undefined, 'Expected headers to be passed as second argument');
      assert.strictEqual(headers['If-Match'], etag);
    });

    it('should return success=true on successful deletion', async () => {
      (client as any).delete.resolves(makeVoidResponse());

      const result = await tasks.deletePlannerTask('ptask-1', etag);

      assert.strictEqual(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // assignPlannerTask
  // ---------------------------------------------------------------------------
  describe('assignPlannerTask', () => {
    const etag = 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="';

    it('should PATCH /planner/tasks/{taskId}', async () => {
      (client as any).patch.resolves(makeResponse({ ...samplePlannerTask }));

      await tasks.assignPlannerTask('ptask-1', 'user-2', etag);

      assert((client as any).patch.calledOnce);
      const [endpoint] = (client as any).patch.firstCall.args;
      assert.strictEqual(endpoint, '/planner/tasks/ptask-1');
    });

    it('should include assignments with the userId in the PATCH body', async () => {
      (client as any).patch.resolves(makeResponse({ ...samplePlannerTask }));

      await tasks.assignPlannerTask('ptask-1', 'user-2', etag);

      const [, body] = (client as any).patch.firstCall.args;
      assert(body.assignments !== undefined, 'Expected assignments in PATCH body');
      assert(body.assignments['user-2'] !== undefined, 'Expected userId key in assignments');
    });

    it('should pass the If-Match header with the etag', async () => {
      (client as any).patch.resolves(makeResponse({ ...samplePlannerTask }));

      await tasks.assignPlannerTask('ptask-1', 'user-2', etag);

      const [, , headers] = (client as any).patch.firstCall.args;
      assert(headers !== undefined, 'Expected headers to be passed as third argument');
      assert.strictEqual(headers['If-Match'], etag);
    });

    it('should return the updated planner task on success', async () => {
      const assigned = {
        ...samplePlannerTask,
        assignments: { 'user-2': { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' } }
      };
      (client as any).patch.resolves(makeResponse(assigned));

      const result = await tasks.assignPlannerTask('ptask-1', 'user-2', etag);

      assert.strictEqual(result.success, true);
      assert(result.data.assignments['user-2'] !== undefined);
    });
  });
});
