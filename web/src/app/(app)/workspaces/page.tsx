"use client";

import { SubmitEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createWorkspace, errorMessage } from "@/lib/api";
import { loadOverview, OverviewProject } from "@/lib/overview";
import { completedDesc, pct, plural } from "@/lib/format";
import { useSession } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Alert, Avatar, Button, Card, CardHeader, Field, Input, Meter, PageHeader, Skeleton } from "@/components/ui";

export default function WorkspacesPage() {
    const router = useRouter();
    const { workspaces, refreshWorkspaces } = useSession();
    const [projects, setProjects] = useState<OverviewProject[] | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadOverview(workspaces)
            .then((data) => {
                if (!cancelled) setProjects(data);
            })
            .catch((err) => {
                if (!cancelled) setError(errorMessage(err));
            });
        return () => {
            cancelled = true;
        };
    }, [workspaces]);

    async function onCreate(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setCreating(true);
        setError(null);
        try {
            const ws = await createWorkspace(trimmed);
            await refreshWorkspaces();
            router.push(`/workspaces/${ws.id}`);
        } catch (err) {
            setError(errorMessage(err));
            setCreating(false);
        }
    }

    const formOpen = showForm || workspaces.length === 0;

    return (
        <div className="space-y-8">
            <PageHeader
                title="Workspaces"
                description="Agrupa las marcas y webs que quieres auditar, por cliente o por equipo."
                actions={
                    !formOpen && (
                        <Button icon="plus" onClick={() => setShowForm(true)}>
                            Nuevo workspace
                        </Button>
                    )
                }
            />

            {error && <Alert tone="error">{error}</Alert>}

            {formOpen && (
                <Card>
                    <CardHeader
                        title={workspaces.length === 0 ? "Crea tu primer workspace" : "Nuevo workspace"}
                        description="Después podrás añadir proyectos y lanzar auditorías."
                    />
                    <form onSubmit={onCreate} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Field label="Nombre" htmlFor="workspace-name">
                                <Input
                                    id="workspace-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Clientes retail"
                                    required
                                    maxLength={120}
                                    autoFocus
                                />
                            </Field>
                        </div>
                        <div className="flex gap-2">
                            {workspaces.length > 0 && (
                                <Button variant="ghost" onClick={() => setShowForm(false)} className="h-10">
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" loading={creating} className="h-10">
                                Crear workspace
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {workspaces.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {workspaces.map((w) => {
                        const wsProjects = projects?.filter((p) => p.workspace_id === w.id) ?? [];
                        const audits = wsProjects.reduce((n, p) => n + p.audits.length, 0);
                        const sovs = wsProjects
                            .map((p) => completedDesc(p.audits)[0]?.result.share_of_voice)
                            .filter((v): v is number => typeof v === "number");
                        const avg = sovs.length ? sovs.reduce((a, b) => a + b, 0) / sovs.length : null;

                        return (
                            <Link
                                key={w.id}
                                href={`/workspaces/${w.id}`}
                                className="group block rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-zinc-300 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <Avatar name={w.name} className="size-10 text-sm" />
                                    <Icon
                                        name="arrowRight"
                                        className="size-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-600"
                                    />
                                </div>
                                <h2 className="mt-4 truncate font-semibold text-zinc-900">{w.name}</h2>
                                {projects ? (
                                    <>
                                        <p className="mt-0.5 text-sm text-zinc-500">
                                            {plural(wsProjects.length, "proyecto")} · {plural(audits, "auditoría")}
                                        </p>
                                        <div className="mt-5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-zinc-500">Share of voice medio</span>
                                                <span className="font-medium tabular-nums text-zinc-900">{pct(avg)}</span>
                                            </div>
                                            <Meter value={avg ?? 0} className="mt-1.5" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 space-y-3">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="mt-5 h-2 w-full" />
                                    </div>
                                )}
                            </Link>
                        );
                    })}

                    {!formOpen && (
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(true);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-500 transition hover:border-zinc-400 hover:bg-white hover:text-zinc-800"
                        >
                            <Icon name="plus" className="size-5" />
                            Nuevo workspace
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
