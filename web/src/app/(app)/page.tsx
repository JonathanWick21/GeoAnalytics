"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/api";
import { loadOverview, OverviewProject } from "@/lib/overview";
import { completedDesc, hostname, pct, plural, promptStats, statusMeta } from "@/lib/format";
import { useSession } from "@/components/AppShell";
import { Icon, IconName } from "@/components/icons";
import {
    Alert,
    Avatar,
    ButtonLink,
    Card,
    CardHeader,
    Delta,
    EmptyState,
    Meter,
    PageHeader,
    Skeleton,
    StatusBadge,
    TileLabel,
} from "@/components/ui";

function computeStats(projects: OverviewProject[]) {
    const audits = projects.flatMap((project) => project.audits.map((audit) => ({ audit, project })));

    const counts = { completed: 0, running: 0, failed: 0 };
    for (const { audit } of audits) {
        if (audit.status === "completed") counts.completed++;
        else if (audit.status === "failed") counts.failed++;
        else counts.running++;
    }

    const ranking = projects
        .flatMap((project) => {
            const [latest, previous] = completedDesc(project.audits);
            if (!latest) return [];
            return [
                {
                    project,
                    audit: latest,
                    sov: latest.result.share_of_voice,
                    delta: previous ? latest.result.share_of_voice - previous.result.share_of_voice : null,
                    prompts: promptStats(latest.result),
                },
            ];
        })
        .sort((a, b) => b.sov - a.sov);

    const avgSov = ranking.length ? ranking.reduce((s, r) => s + r.sov, 0) / ranking.length : null;
    // Solo auditorías con detalle por prompt: las antiguas/demo traen `mentions` sin total
    // y sumarlas daría ratios imposibles (p. ej. 6/5).
    const prompts = ranking
        .filter((r) => r.prompts.total > 0)
        .reduce(
            (acc, r) => ({
                hits: acc.hits + r.prompts.hits,
                total: acc.total + r.prompts.total,
                projects: acc.projects + 1,
            }),
            { hits: 0, total: 0, projects: 0 }
        );
    const recent = [...audits].sort((a, b) => b.audit.id - a.audit.id).slice(0, 8);

    return { total: audits.length, counts, ranking, avgSov, prompts, recent };
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, workspaces } = useSession();
    const [projects, setProjects] = useState<OverviewProject[] | null>(null);
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

    const stats = useMemo(() => (projects ? computeStats(projects) : null), [projects]);
    const name = user.email.split("@")[0];

    return (
        <div className="space-y-8">
            <PageHeader
                title={`Hola, ${name}`}
                description="Resumen de la visibilidad de tus marcas en asistentes de IA."
                actions={
                    workspaces.length > 0 && (
                        <ButtonLink href="/workspaces" variant="secondary" icon="folder">
                            Ver workspaces
                        </ButtonLink>
                    )
                }
            />

            {error && (
                <Alert tone="error" title="No se pudo cargar el dashboard">
                    {error}
                </Alert>
            )}

            {workspaces.length === 0 ? (
                <Onboarding />
            ) : !stats || !projects ? (
                !error && <DashboardSkeleton />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Card className="p-5 sm:col-span-2 xl:col-span-1">
                            <TileLabel icon="target">Share of voice medio</TileLabel>
                            <div className="mt-3 text-5xl font-semibold tracking-tight text-zinc-900">
                                {pct(stats.avgSov)}
                            </div>
                            <Meter value={stats.avgSov ?? 0} className="mt-4" />
                            <p className="mt-2 text-xs text-zinc-500">
                                {stats.ranking.length
                                    ? `Última auditoría de ${plural(stats.ranking.length, "proyecto")}`
                                    : "Sin auditorías completadas"}
                            </p>
                        </Card>
                        <StatTile
                            icon="globe"
                            label="Proyectos"
                            value={projects.length}
                            hint={`En ${plural(workspaces.length, "workspace")}`}
                        />
                        <StatTile
                            icon="fileText"
                            label="Auditorías completadas"
                            value={stats.counts.completed}
                            hint={
                                stats.counts.failed
                                    ? `${plural(stats.counts.failed, "fallida")} de ${stats.total}`
                                    : `De ${plural(stats.total, "auditoría")}`
                            }
                        />
                        <StatTile
                            icon="message"
                            label="Prompts con mención"
                            value={
                                stats.prompts.total ? (
                                    <>
                                        {stats.prompts.hits}
                                        <span className="text-lg font-medium text-zinc-400">/{stats.prompts.total}</span>
                                    </>
                                ) : (
                                    "—"
                                )
                            }
                            hint={
                                stats.prompts.projects
                                    ? `Última auditoría de ${plural(stats.prompts.projects, "proyecto")}`
                                    : "Sin detalle por prompt todavía"
                            }
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader
                                title="Share of voice por proyecto"
                                description="% de prompts en los que la IA menciona la marca, según su última auditoría."
                            />
                            {stats.ranking.length === 0 ? (
                                <EmptyState
                                    icon="target"
                                    title="Aún no hay resultados"
                                    description={
                                        projects.length
                                            ? "Lanza una auditoría desde un workspace para ver aquí la comparativa."
                                            : "Crea un proyecto dentro de un workspace y lanza su primera auditoría."
                                    }
                                    action={
                                        <ButtonLink href={`/workspaces/${workspaces[0].id}`} variant="secondary">
                                            Ir a {workspaces[0].name}
                                        </ButtonLink>
                                    }
                                />
                            ) : (
                                <ul className="divide-y divide-zinc-100 px-5">
                                    {stats.ranking.map((r) => (
                                        <li key={r.project.id} className="group relative">
                                            <Link href={`/audits/${r.audit.id}`} className="block py-3.5">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <div className="min-w-0 truncate text-sm">
                                                        <span className="font-medium text-zinc-900 group-hover:underline">
                                                            {r.project.name}
                                                        </span>
                                                        <span className="text-zinc-400"> · {r.project.workspace.name}</span>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-3">
                                                        <Delta value={r.delta} />
                                                        <span className="w-11 text-right text-sm font-semibold tabular-nums text-zinc-900">
                                                            {pct(r.sov)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Meter value={r.sov} className="mt-2" />
                                            </Link>
                                            <div
                                                role="tooltip"
                                                className="pointer-events-none absolute right-0 top-0 z-10 -translate-y-3/4 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                                            >
                                                Auditoría #{r.audit.id}
                                                {r.prompts.total > 0 &&
                                                    ` · ${r.prompts.hits} de ${r.prompts.total} prompts mencionan la marca`}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <div className="space-y-6">
                            <StatusCard counts={stats.counts} total={stats.total} />

                            <Card>
                                <CardHeader
                                    title="Workspaces"
                                    action={
                                        <Link href="/workspaces" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                                            Ver todos
                                        </Link>
                                    }
                                />
                                <ul className="p-2">
                                    {workspaces.slice(0, 5).map((w) => {
                                        const count = projects.filter((p) => p.workspace_id === w.id).length;
                                        return (
                                            <li key={w.id}>
                                                <Link
                                                    href={`/workspaces/${w.id}`}
                                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50"
                                                >
                                                    <Avatar name={w.name} className="size-7 rounded-md text-[11px]" />
                                                    <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">{w.name}</span>
                                                    <span className="text-xs text-zinc-500">{plural(count, "proyecto")}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Card>
                        </div>
                    </div>

                    <Card>
                        <CardHeader title="Auditorías recientes" description="Las últimas auditorías lanzadas en todos tus workspaces." />
                        {stats.recent.length === 0 ? (
                            <EmptyState icon="fileText" title="Todavía no has lanzado ninguna auditoría" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                                            <th className="px-5 py-2.5 font-medium">Auditoría</th>
                                            <th className="px-3 py-2.5 font-medium">Proyecto</th>
                                            <th className="hidden px-3 py-2.5 font-medium md:table-cell">Workspace</th>
                                            <th className="px-3 py-2.5 font-medium">Estado</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Share of voice</th>
                                            <th className="w-10 px-5 py-2.5" aria-hidden="true" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {stats.recent.map(({ audit, project }) => (
                                            <tr
                                                key={audit.id}
                                                onClick={() => router.push(`/audits/${audit.id}`)}
                                                className="cursor-pointer transition-colors hover:bg-zinc-50"
                                            >
                                                <td className="px-5 py-3">
                                                    <Link
                                                        href={`/audits/${audit.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="font-medium tabular-nums text-zinc-900 hover:underline"
                                                    >
                                                        #{audit.id}
                                                    </Link>
                                                </td>
                                                <td className="max-w-[14rem] px-3 py-3">
                                                    <div className="truncate font-medium text-zinc-900">{project.name}</div>
                                                    <div className="truncate text-xs text-zinc-500">{hostname(project.url)}</div>
                                                </td>
                                                <td className="hidden px-3 py-3 text-zinc-600 md:table-cell">
                                                    {project.workspace.name}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <StatusBadge status={audit.status} />
                                                </td>
                                                <td className="px-3 py-3 text-right font-medium tabular-nums text-zinc-900">
                                                    {audit.result ? pct(audit.result.share_of_voice) : "—"}
                                                </td>
                                                <td className="px-5 py-3 text-zinc-300">
                                                    <Icon name="chevronRight" className="size-4" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}

function StatTile({ icon, label, value, hint }: { icon: IconName; label: string; value: ReactNode; hint: string }) {
    return (
        <Card className="p-5">
            <TileLabel icon={icon}>{label}</TileLabel>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
            <p className="mt-2 text-xs text-zinc-500">{hint}</p>
        </Card>
    );
}

function StatusCard({ counts, total }: { counts: { completed: number; running: number; failed: number }; total: number }) {
    const rows = (["completed", "running", "failed"] as const).map((key) => ({ key, count: counts[key], ...statusMeta(key) }));

    return (
        <Card>
            <CardHeader title="Estado de auditorías" description={plural(total, "auditoría")} />
            <div className="p-5">
                {total === 0 ? (
                    <p className="text-sm text-zinc-500">Sin auditorías todavía.</p>
                ) : (
                    <>
                        <div
                            className="flex h-2 gap-0.5"
                            role="img"
                            aria-label={rows.map((r) => `${r.label}: ${r.count}`).join(", ")}
                        >
                            {rows
                                .filter((r) => r.count > 0)
                                .map((r) => (
                                    <span
                                        key={r.key}
                                        className="rounded-full"
                                        style={{ flexGrow: r.count, backgroundColor: r.color }}
                                    />
                                ))}
                        </div>
                        <ul className="mt-4 space-y-2.5">
                            {rows.map((r) => (
                                <li key={r.key} className="flex items-center gap-2.5 text-sm">
                                    <span
                                        className="flex size-5 items-center justify-center rounded-full text-white"
                                        style={{ backgroundColor: r.color }}
                                    >
                                        <Icon name={r.icon} className="size-3" />
                                    </span>
                                    <span className="text-zinc-700">{r.label}</span>
                                    <span className="ml-auto font-medium tabular-nums text-zinc-900">{r.count}</span>
                                    <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
                                        {Math.round((r.count / total) * 100)}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </Card>
    );
}

function Onboarding() {
    const steps = [
        { title: "Crea un workspace", text: "Agrupa tus marcas por cliente o equipo." },
        { title: "Añade un proyecto", text: "El nombre de la marca y la URL de su web." },
        { title: "Lanza una auditoría", text: "Medimos si la IA menciona la marca y te damos recomendaciones." },
    ];
    return (
        <Card className="p-8">
            <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-zinc-900">Configura tu primera auditoría</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    En tres pasos sabrás con qué frecuencia los asistentes de IA recomiendan tu marca.
                </p>
            </div>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
                {steps.map((s, i) => (
                    <li key={s.title} className="flex gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800 ring-1 ring-brand-100">
                            {i + 1}
                        </span>
                        <div>
                            <p className="text-sm font-medium text-zinc-900">{s.title}</p>
                            <p className="mt-0.5 text-sm text-zinc-500">{s.text}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <ButtonLink href="/workspaces" icon="plus" className="mt-8">
                Crear workspace
            </ButtonLink>
        </Card>
    );
}

function DashboardSkeleton() {
    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-72 rounded-xl lg:col-span-2" />
                <Skeleton className="h-72 rounded-xl" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
        </>
    );
}
