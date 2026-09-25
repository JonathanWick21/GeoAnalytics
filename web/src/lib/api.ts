const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type User = { id: number, email: string };
export type Workspace = { id: number, name: string, owner_id: number };
export type Project = { id: number, name: string, url: string, workspace_id: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {})
        }
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

export function login(email: string, password: string) {
    return request<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({email, password})
    });
}

export function me() {
    return request<User>("/auth/me");
}

export function logout() {
    return request<{ok: boolean}>("/auth/logout", {method: "POST"});
}

export function listWorkspaces() {
    return request<Workspace[]>("/workspaces");
}

export function createWorkspace(name: string) {
    return request<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name })
    });
}

export function listProjects(workspaceId: number) {
    return request<Project[]>(`/workspaces/${workspaceId}/projects`);
}

export function createProject(name: string, url: string, workspaceId: number) {
    return request<Project>(`/workspaces/${workspaceId}/projects`, {
        method: "POST",
        body: JSON.stringify({ name, url })
    })
}