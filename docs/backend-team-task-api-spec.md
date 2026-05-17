# Backend API Handoff: Team and Task

This document describes the **actual backend API contract** for team and task flows so frontend can integrate against backend behavior.

## Base URL

```text
http://192.168.1.17:3000/api/v1
```

## Integration intent

Use this document as backend source of truth while updating frontend API clients and types.

## Team APIs (Actual Backend Contract)

All team endpoints below require `Authorization: Bearer <token>`.

### Common response envelope

Success:

```ts
{
  success: true;
  data: T;
}
```

Error:

```ts
{
  success: false;
  message: string;
  details?: unknown;
}
```

### 1. List teams for current user

**Endpoint**

```text
GET /teams/me
```

**Response**

```ts
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    role: 'admin' | 'member';
    createdAt: string;
  }>;
}
```

**Example curl**

```bash
curl 'http://192.168.1.17:3000/api/v1/teams/me' \
  -X GET \
  -H 'Authorization: Bearer <token>'
```

### 2. Get team details

**Endpoint**

```text
GET /teams/:teamId
```

**Path params**

```ts
{
  teamId: number;
}
```

**Response**

```ts
{
  success: true;
  data: {
    id: number;
    name: string;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 3. Update team

**Endpoint**

```text
PATCH /teams/:teamId
```

**Request body**

```ts
{
  name?: string; // 2..120 chars
}
```

At least one field is required.  
Requires team admin role (`team:manage`).

**Response**

```ts
{
  success: true;
  data: {
    id: number;
    name: string;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 4. List team members

**Endpoint**

```text
GET /teams/:teamId/members
```

**Query params**

```ts
{
  page?: number; // default 1
  pageSize?: number; // default 10, max 100
}
```

**Response**

```ts
{
  success: true;
  data: {
    items: Array<{
      id: number;
      name: string;
      email: string;
      role: 'admin' | 'member';
    }>;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### 5. Add or update a team member

**Endpoint**

```text
POST /teams/:teamId/members
```

**Path params**

```ts
{
  teamId: number;
}
```

**Request body**

```ts
{
  targetUserId: number;
  role: 'admin' | 'member';
}
```

**Response**

```ts
{
  success: true;
  data: {
    teamId: number;
    userId: number;
    role: 'admin' | 'member';
  };
}
```

### 6. Remove a team member

**Endpoint**

```text
DELETE /teams/:teamId/members/:targetUserId
```

**Path params**

```ts
{
  teamId: number;
  targetUserId: number;
}
```

**Response**

```ts
{
  success: true;
  message: 'Member removed successfully';
}
```

### Team module notes

- There is currently **no** `GET /teams/current`.
- There is currently **no** `POST /teams`.
- There is currently **no** `GET /teams/current/members` (use `GET /teams/:teamId/members`).
- There is currently **no** `POST /teams/current/invite` (use `POST /teams/:teamId/members`).
- Team bootstrap is done during `POST /auth/register` (via `teamName`), not through a standalone team-create endpoint.

## User APIs (Actual Backend Contract)

All user endpoints below require `Authorization: Bearer <token>`.

### 1. Search users

**Endpoint**

```text
GET /users/search?q=<query>&limit=<number>
```

**Query params**

```ts
{
  q: string; // required
  limit?: number; // default 10, max 50
}
```

**Response**

```ts
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}
```

## Task APIs (Actual Backend Contract)

All task endpoints below require `Authorization: Bearer <token>`.

### Enums and field names used by backend

```ts
type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';
```

Task payload field names are:

- `assignedTo` (not `assigneeId`)
- `deadline` (not `dueDate`)

### 1. List tasks in a team

**Endpoint**

```text
GET /teams/:teamId/tasks
```

**Path params**

```ts
{
  teamId: number;
}
```

**Query params (cursor-based pagination)**

```ts
{
  limit?: number; // 1..100, default 20
  cursor?: string; // opaque base64 cursor
  status?: 'todo' | 'in_progress' | 'done';
  assignedTo?: number;
  search?: string;
  sortBy?: 'created_at' | 'priority';
  sortOrder?: 'asc' | 'desc';
}
```

**Response**

```ts
{
  success: true;
  data: {
    items: Array<{
      id: number;
      teamId: number;
      title: string;
      description: string | null;
      priority: 'low' | 'medium' | 'high';
      status: 'todo' | 'in_progress' | 'done';
      assignedTo: number | null;
      deadline: string | null;
      createdBy: number;
      createdAt: string;
      updatedAt: string;
    }>;
    pageInfo: {
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
}
```

### 2. Create task in a team

**Endpoint**

```text
POST /teams/:teamId/tasks
```

**Request body**

```ts
{
  title: string; // required, min 2
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done';
  assignedTo?: number;
  deadline?: string; // YYYY-MM-DD
}
```

**Response**

```ts
{
  success: true;
  data: Task; // same task shape as list items
}
```

### 3. Update task

**Endpoint**

```text
PATCH /teams/:teamId/tasks/:taskId
```

**Request body**

```ts
{
  title?: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done';
  assignedTo?: number | null;
  deadline?: string | null; // YYYY-MM-DD
}
```

At least one field is required.

**Response**

```ts
{
  success: true;
  data: Task; // same task shape as list items
}
```

### 4. Delete task

**Endpoint**

```text
DELETE /teams/:teamId/tasks/:taskId
```

**Response**

```ts
{
  success: true;
  message: 'Task deleted successfully';
}
```

### Task module notes

- There is currently **no** top-level `GET /tasks` or `POST /tasks`.
- There is currently **no** `PATCH /tasks/:taskId/assign`.
- There is currently **no** `PATCH /tasks/:taskId/status`.
- Pagination is cursor-based (`limit` + `cursor`), not page-based (`page` + `pageSize`).

## Source references

- Team API client: `[app/src/features/team/api.ts](../app/src/features/team/api.ts)`
- Task API client: `[app/src/features/tasks/api.ts](../app/src/features/tasks/api.ts)`
- Team types: `[app/src/types/team.ts](../app/src/types/team.ts)`
- Task types: `[app/src/types/task.ts](../app/src/types/task.ts)`
- Shared pagination types: `[app/src/types/api.ts](../app/src/types/api.ts)`
