const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type User = { id: number, email: string };
export type Workspace = { id: number, name: string, owner_id: number };
export type Project = { id: number, name: string, url: string, workspace_id: number };

export type AuditEngine = { name: string, mentioned: boolean, score: number };
export type AuditResult = {
    brand?: string,
    url?: string,
    summary?: string,
    mentions?: number,
    share_of_voice: number,
    engines?: AuditEngine[],
    recommendations?: string[],
    source_chars?: number,
    crawl_warning?: string,
    grounded?: boolean,
    prompt_results?: { prompt: string; mentioned: boolean; answer_excerpt?: string }[],
    method?: string;
    demo?: boolean;
};
export type Audit = {
    id: number,
    project_id: number,
    status: string,
    result: AuditResult | null,
    error: string | null
}



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
        let text = await res.text();
        text = text.replace(/key=[^&\s"']+/gi, "key=***");
        text = text.replace(/AIza[0-9A-Za-z_-]+/g, "***");
        text = text.replace(/AQ\.[0-9A-Za-z_-]+/g, "***");
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

const ERROR_TRANSLATIONS: Record<string, string> = {
    "Invalid email or password": "Email o contraseña incorrectos.",
    "Email already registered": "Ya existe una cuenta con ese email.",
    "Not authenticated": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    "Invalid session": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    "Audit not found": "Auditoría no encontrada.",
    "Failed to fetch": "No se pudo conectar con el servidor. ¿Está el backend en marcha?",
};

/** Convierte un error de `request` (texto o JSON de FastAPI) en un mensaje legible. */
export function errorMessage(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    let message = raw;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.detail === "string") {
            message = parsed.detail;
        } else if (Array.isArray(parsed?.detail)) {
            message = parsed.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(". ");
        }
    } catch {
        // no es JSON: usamos el texto tal cual
    }
    return ERROR_TRANSLATIONS[message] ?? message;
}

export function register(email: string, password: string) {
    return request<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export function login(email: string, password: string) {
    return request<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export function me() {
    return request<User>("/auth/me");
}

export function logout() {
    return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
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

export function listAudits(project_id: number) {
    return request<Audit[]>(`/projects/${project_id}/audits`);
}

export function startAudit(project_id: number) {
    return request<Audit>(`/projects/${project_id}/audits`, {
        method: 'POST'
    });

}

export function getAudit(audit_id: number) {
    return request<Audit>(`/audits/${audit_id}`);
}