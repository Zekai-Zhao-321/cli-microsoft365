# M365 Tasks

Full task management via the `tasks` module of the M365 agent layer, covering both Microsoft To Do and Microsoft Planner.

## Operations Overview (17 total)

| Category             | Operations                                                                           |
|----------------------|--------------------------------------------------------------------------------------|
| To Do — Task Lists   | listTaskLists, getTaskList, createTaskList                                           |
| To Do — Tasks        | listTasks, getTask, createTask, updateTask, completeTask, deleteTask                 |
| Planner — Plans      | listPlansForGroup, getPlan                                                           |
| Planner — Buckets    | listBuckets                                                                          |
| Planner — Tasks      | listTasksInPlan, getPlannerTask, createPlannerTask, updatePlannerTask, deletePlannerTask, assignPlannerTask |

## Choosing the Right System

| Scenario                                    | Use          |
|---------------------------------------------|--------------|
| Personal reminders, shopping lists          | Microsoft To Do |
| Team project work tracked on a board        | Planner      |
| Tasks assigned to specific people with due dates in a shared plan | Planner |
| Recurring personal tasks with reminders     | To Do        |

## Workflow: Personal Tasks with Microsoft To Do

### Create a task in the default list

```bash
# Step 1: Find the list ID
m365 agent execute --module tasks --operation listTaskLists

# Step 2: Create a task
m365 agent execute --module tasks --operation createTask \
  --params '{
    "listId": "<listId>",
    "title": "Review Q1 budget spreadsheet",
    "dueDateTime": {"dateTime":"2026-04-10T17:00:00","timeZone":"UTC"},
    "importance": "high",
    "body": {"content":"Focus on marketing line items","contentType":"text"},
    "reminderDateTime": {"dateTime":"2026-04-10T09:00:00","timeZone":"UTC"}
  }'
```

### List and complete tasks

```bash
# List all tasks in a list
m365 agent execute --module tasks --operation listTasks \
  --params '{"listId":"<listId>"}'

# Complete a task
m365 agent execute --module tasks --operation completeTask \
  --params '{"listId":"<listId>","taskId":"<taskId>"}'

# Update a task's due date
m365 agent execute --module tasks --operation updateTask \
  --params '{
    "listId": "<listId>",
    "taskId": "<taskId>",
    "updates": {
      "dueDateTime": {"dateTime":"2026-04-15T17:00:00","timeZone":"UTC"}
    }
  }'
```

### Manage task lists

```bash
# Create a new list
m365 agent execute --module tasks --operation createTaskList \
  --params '{"displayName":"Home Renovation"}'

# Get details of a list
m365 agent execute --module tasks --operation getTaskList \
  --params '{"listId":"<listId>"}'
```

## Workflow: Team Projects with Microsoft Planner

### Discover plans in a group

```bash
# Step 1: Get the group (team) ID — use teams.listMyTeams or people.searchUsers
# Step 2: List plans
m365 agent execute --module tasks --operation listPlansForGroup \
  --params '{"groupId":"<groupId>"}'

# Get a specific plan
m365 agent execute --module tasks --operation getPlan \
  --params '{"planId":"<planId>"}'
```

### Browse buckets and tasks

```bash
# List buckets (columns on the board)
m365 agent execute --module tasks --operation listBuckets \
  --params '{"planId":"<planId>"}'

# List all tasks in a plan
m365 agent execute --module tasks --operation listTasksInPlan \
  --params '{"planId":"<planId>"}'
```

### Create and assign a Planner task

```bash
# Create a task in a bucket
m365 agent execute --module tasks --operation createPlannerTask \
  --params '{
    "planId": "<planId>",
    "bucketId": "<bucketId>",
    "title": "Implement login page",
    "dueDateTime": "2026-04-15T17:00:00Z"
  }'

# Assign a task to a user (etag comes from getPlannerTask response)
m365 agent execute --module tasks --operation assignPlannerTask \
  --params '{
    "taskId": "<taskId>",
    "userId": "<userId>",
    "etag": "\"<etag>\""
  }'
```

### Update and delete Planner tasks

```bash
# Update title and percent complete
m365 agent execute --module tasks --operation updatePlannerTask \
  --params '{
    "taskId": "<taskId>",
    "updates": {"title":"Implement login page v2","percentComplete":50},
    "etag": "\"<etag>\""
  }'

# Delete a task
m365 agent execute --module tasks --operation deletePlannerTask \
  --params '{"taskId":"<taskId>","etag":"\"<etag>\""}'
```

> **Note on ETags:** Planner requires an `If-Match` header (etag) for all PATCH/DELETE operations to prevent concurrent-edit conflicts. Retrieve the current etag via `getPlannerTask`.

## createTask — Full Parameter Reference

```json
{
  "listId": "string (required)",
  "title": "string (required)",
  "body": {
    "content": "Notes for this task",
    "contentType": "text"
  },
  "dueDateTime": {
    "dateTime": "2026-04-10T17:00:00",
    "timeZone": "UTC"
  },
  "reminderDateTime": {
    "dateTime": "2026-04-10T09:00:00",
    "timeZone": "UTC"
  },
  "importance": "low | normal | high"
}
```

## Operation Routing

| User intent                              | Operation                                      |
|------------------------------------------|------------------------------------------------|
| "Add a task to my to-do list"            | listTaskLists → createTask                     |
| "What tasks do I have?"                  | listTaskLists → listTasks                      |
| "Mark that task as done"                 | completeTask                                   |
| "Change the due date"                    | updateTask                                     |
| "Create a new To Do list"                | createTaskList                                 |
| "Show the Planner board"                 | listPlansForGroup → listBuckets → listTasksInPlan |
| "Add a task to the sprint backlog"       | createPlannerTask                              |
| "Assign the task to Alice"               | assignPlannerTask                              |
| "Mark the Planner task 50% complete"     | updatePlannerTask (percentComplete: 50)        |
| "Delete that task from the plan"         | deletePlannerTask                              |

## Error Handling

| Situation                       | Likely cause                           | Fix                                                      |
|---------------------------------|----------------------------------------|----------------------------------------------------------|
| `Authorization_RequestDenied`   | Missing `Tasks.ReadWrite`              | Re-authenticate with Tasks scope                         |
| `Request_ResourceNotFound`      | Stale list/task/plan ID               | Re-list to get current IDs                               |
| 412 `PreconditionFailed` (Planner) | Stale or missing etag              | Fetch the latest etag via `getPlannerTask` and retry     |
| `BadRequest` on createTask      | Missing required `title` field         | Ensure title is included in params                       |
| Planner task not visible        | Wrong planId or bucketId              | Use `listPlansForGroup` then `listBuckets` to verify IDs |
