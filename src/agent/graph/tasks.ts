import { GraphClient } from '../graph-client.js';
import { GraphResponse, GraphRequestOptions } from '../types.js';

export class TasksOperations {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
  }

  // ---------------------------------------------------------------------------
  // To Do: Task Lists
  // ---------------------------------------------------------------------------

  public async listTaskLists(): Promise<GraphResponse<any[]>> {
    return this.client.get('/me/todo/lists');
  }

  public async getTaskList(listId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/me/todo/lists/${listId}`);
  }

  public async createTaskList(displayName: string): Promise<GraphResponse<any>> {
    return this.client.post('/me/todo/lists', { displayName });
  }

  // ---------------------------------------------------------------------------
  // To Do: Tasks
  // ---------------------------------------------------------------------------

  public async listTasks(listId: string, options?: GraphRequestOptions): Promise<GraphResponse<any[]>> {
    return this.client.get(`/me/todo/lists/${listId}/tasks`, options);
  }

  public async getTask(listId: string, taskId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/me/todo/lists/${listId}/tasks/${taskId}`);
  }

  public async createTask(listId: string, params: {
    title: string;
    body?: { content: string; contentType: string };
    dueDateTime?: { dateTime: string; timeZone: string };
    importance?: string;
    reminderDateTime?: { dateTime: string; timeZone: string };
  }): Promise<GraphResponse<any>> {
    return this.client.post(`/me/todo/lists/${listId}/tasks`, params);
  }

  public async updateTask(listId: string, taskId: string, updates: Record<string, any>): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/todo/lists/${listId}/tasks/${taskId}`, updates);
  }

  public async completeTask(listId: string, taskId: string): Promise<GraphResponse<any>> {
    return this.client.patch(`/me/todo/lists/${listId}/tasks/${taskId}`, { status: 'completed' });
  }

  public async deleteTask(listId: string, taskId: string): Promise<GraphResponse<void>> {
    return this.client.delete(`/me/todo/lists/${listId}/tasks/${taskId}`);
  }

  // ---------------------------------------------------------------------------
  // Planner: Plans
  // ---------------------------------------------------------------------------

  public async listPlansForGroup(groupId: string): Promise<GraphResponse<any[]>> {
    return this.client.get(`/groups/${groupId}/planner/plans`);
  }

  public async getPlan(planId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/planner/plans/${planId}`);
  }

  // ---------------------------------------------------------------------------
  // Planner: Buckets
  // ---------------------------------------------------------------------------

  public async listBuckets(planId: string): Promise<GraphResponse<any[]>> {
    return this.client.get(`/planner/plans/${planId}/buckets`);
  }

  // ---------------------------------------------------------------------------
  // Planner: Tasks
  // ---------------------------------------------------------------------------

  public async listTasksInPlan(planId: string): Promise<GraphResponse<any[]>> {
    return this.client.get(`/planner/plans/${planId}/tasks`);
  }

  public async getPlannerTask(taskId: string): Promise<GraphResponse<any>> {
    return this.client.get(`/planner/tasks/${taskId}`);
  }

  public async createPlannerTask(params: {
    planId: string;
    bucketId: string;
    title: string;
    dueDateTime?: string;
    assignments?: Record<string, any>;
  }): Promise<GraphResponse<any>> {
    return this.client.post('/planner/tasks', params);
  }

  public async updatePlannerTask(taskId: string, updates: Record<string, any>, etag: string): Promise<GraphResponse<any>> {
    return this.client.patch(`/planner/tasks/${taskId}`, updates, { 'If-Match': etag });
  }

  public async deletePlannerTask(taskId: string, etag: string): Promise<GraphResponse<void>> {
    return this.client.delete(`/planner/tasks/${taskId}`, { 'If-Match': etag });
  }

  public async assignPlannerTask(taskId: string, userId: string, etag: string): Promise<GraphResponse<any>> {
    const assignments: Record<string, any> = {
      [userId]: {
        '@odata.type': '#microsoft.graph.plannerAssignment',
        orderHint: ' !'
      }
    };
    return this.client.patch(`/planner/tasks/${taskId}`, { assignments }, { 'If-Match': etag });
  }
}
