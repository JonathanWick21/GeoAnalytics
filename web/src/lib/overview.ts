import { listAudits, listProjects, Audit, Project, Workspace } from "@/lib/api";

export type ProjectWithAudits = Project & { audits: Audit[] };
export type OverviewProject = ProjectWithAudits & { workspace: Workspace };

export async function attachAudits(projects: Project[]): Promise<ProjectWithAudits[]> {
    return Promise.all(
        projects.map(async (p) => ({ ...p, audits: await listAudits(p.id) }))
    );
}

/** Todos los proyectos de todos los workspaces, con sus auditorías. */
export async function loadOverview(workspaces: Workspace[]): Promise<OverviewProject[]> {
    const perWorkspace = await Promise.all(
        workspaces.map(async (workspace) => {
            const projects = await attachAudits(await listProjects(workspace.id));
            return projects.map((p) => ({ ...p, workspace }));
        })
    );
    return perWorkspace.flat();
}

/** El backend no expone GET /projects/{id}: lo buscamos en los workspaces del usuario. */
export async function findProject(projectId: number, workspaces: Workspace[]) {
    for (const workspace of workspaces) {
        const project = (await listProjects(workspace.id)).find((p) => p.id === projectId);
        if (project) return { project, workspace };
    }
    return null;
}
