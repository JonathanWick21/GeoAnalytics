"use client";

import { SubmitEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createProject, errorMessage, listProjects, startAudit } from "@/lib/api";
import { attachAudits, ProjectWithAudits } from "@/lib/overview";
import { completedDesc, pct, plural } from "@/lib/format";
import { useSession } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import {
    Alert,
    Button,
    ButtonLink,
    Card,
    CardHeader,
    EmptyState,
    Field,
    Input,
    PageHeader,
    Skeleton,
} from "@/components/ui";

type Notice = { tone: "success" | "error"; auditId: number; text: string };

function normalizeUrl(raw: string) {
    const url = raw.trim();
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function WorkspaceDetailPage() {
    const params = useParams();
    const workspaceId = Number(params.id);
    const { workspaces } = useSession();
    const workspace = workspaces.find((w) => w.id === workspaceId);

    const [projects, setProjects] = useState<ProjectWithAudits[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [creating, setCreating] = useState(false);
    const [auditingId, setAuditingId] = useState<number | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);

    const load = useCallback(async () => {
        try {
            setProjects(await attachAudits(await listProjects(workspaceId)));
        } catch (err) {
            setError(errorMessage(err));
            setProjects((p) => p ?? []);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (!Number.isFinite(workspaceId) || !workspace) return;
        load();
    }, [workspaceId, workspace, load]);

    async function onCreate(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setCreating(true);
        setError(null);
        try {
            await createProject(name.trim(), normalizeUrl(url), workspaceId);
            setName("");
            setUrl("");
            setShowForm(false);
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setCreating(false);
        }
    }

    async function runAudit(project: ProjectWithAudits) {
        setError(null);
        setNotice(null);
        setAuditingId(project.id);
        try {
            const audit = await startAudit(project.id);
            setNotice(
                audit.status === "failed"
                    ? { tone: "error", auditId: audit.id, text: `La auditoría de «${project.name}» ha fallado.` }
                    : {
                          tone: "success",
                          auditId: audit.id,
                          text: `Auditoría de «${project.name}» completada: share of voice ${pct(audit.result?.share_of_voice)}.`,
                      }
            );
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setAuditingId(null);
        }
    }

    if (!workspace) {
        return (
            <Card>
                <EmptyState
                    icon="folder"
                    title="Workspace no encontrado"
                    description="Puede que no exista o que no tengas acceso."
                    action={
                        <ButtonLink href="/workspaces" variant="secondary" icon="arrowLeft">
                            Ver workspaces
                        </ButtonLink>
                    }
                />
            </Card>
        );
    }

    const auditCount = projects?.reduce((n, p) => n + p.audits.length, 0) ?? 0;
    const latestSov = (projects ?? [])
        .map((p) => completedDesc(p.audits)[0]?.result.share_of_voice)
        .filter((v): v is number => typeof v === "number");
    const avgSov = latestSov.length ? latestSov.reduce((a, b) => a + b, 0) / latestSov.length : null;
    const formOpen = showForm || projects?.length === 0;

    return (
        <div className="space-y-8">
            <PageHeader
                breadcrumbs={[{ label: "Workspaces", href: "/workspaces" }, { label: workspace.name }]}
                title={workspace.name}
                description={
                    projects
                        ? `${plural(projects.length, "proyecto")} · ${plural(auditCount, "auditoría")} · Share of voice medio ${pct(avgSov)}`
                        : "Cargando proyectos…"
                }
                actions={
                    !formOpen && (
                        <Button icon="plus" onClick={() => setShowForm(true)}>
                            Nuevo proyecto
                        </Button>
                    )
                }
            />

            {notice && (
                <Alert
                    tone={notice.tone}
                    action={
                        <Link
                            href={`/audits/${notice.auditId}`}
                            className="inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
                        >
                            Ver informe
                        </Link>
                    }
                >
                    {notice.text}
                </Alert>
            )}
            {error && <Alert tone="error">{error}</Alert>}

            {formOpen && (
                <Card>
                    <CardHeader
                        title="Nuevo proyecto"
                        description="Cada proyecto es una marca y su web. Lo usaremos para generar prompts y detectar menciones."
                    />
                    <form onSubmit={onCreate} className="grid gap-4 p-5 sm:grid-cols-2">
                        <Field label="Nombre de la marca" htmlFor="project-name" hint="Se busca tal cual en las respuestas de la IA.">
                            <Input
                                id="project-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Acme"
                                required
                                maxLength={120}
                                autoFocus={showForm}
                            />
                        </Field>
                        <Field label="URL del sitio" htmlFor="project-url" hint="Página que se rastreará para dar contexto.">
                            <Input
                                id="project-url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://acme.com"
                                required
                                maxLength={500}
                                inputMode="url"
                            />
                        </Field>
                        <div className="flex justify-end gap-2 sm:col-span-2">
                            {projects && projects.length > 0 && (
                                <Button variant="ghost" onClick={() => setShowForm(false)}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" icon="plus" loading={creating}>
                                Crear proyecto
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {!projects ? (
                <div className="grid gap-6 xl:grid-cols-2">
                    {[0, 1].map((i) => (
                        <Skeleton key={i} className="h-64 rounded-xl" />
                    ))}
                </div>
            ) : (
                projects.length > 0 && (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {projects.map((p) => (
                            <ProjectCard
                                key={p.id}
                                project={p}
                                auditing={auditingId === p.id}
                                disabled={auditingId !== null}
                                onAudit={() => runAudit(p)}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
