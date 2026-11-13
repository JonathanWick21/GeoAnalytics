"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { errorMessage, getAudit, listAudits, startAudit, Audit, Project, Workspace } from "@/lib/api";
import { findProject } from "@/lib/overview";
import { completedDesc, hostname, pct, statusMeta } from "@/lib/format";
import { useSession } from "@/components/AppShell";
import { AuditResultCard } from "@/components/AuditResultCard";
import { Icon } from "@/components/icons";
import {
    Alert,
    Button,
    ButtonLink,
    Card,
    CardHeader,
    EmptyState,
    PageHeader,
    Skeleton,
    StatusBadge,
    cx,
} from "@/components/ui";

export default function AuditDetailPage() {
    const params = useParams();
    const router = useRouter();
    const auditId = Number(params.id);
    const { workspaces } = useSession();

    const [audit, setAudit] = useState<Audit | null>(null);
    const [context, setContext] = useState<{ project: Project; workspace: Workspace } | null>(null);
    const [history, setHistory] = useState<Audit[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [rerunning, setRerunning] = useState(false);

    useEffect(() => {
        if (!Number.isFinite(auditId)) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const a = await getAudit(auditId);
                if (cancelled) return;
                setAudit(a);
                const [ctx, audits] = await Promise.all([
                    findProject(a.project_id, workspaces).catch(() => null),
                    listAudits(a.project_id).catch(() => []),
                ]);
                if (cancelled) return;
                setContext(ctx);
                setHistory(audits);
            } catch (err) {
                if (!cancelled) {
                    setError(errorMessage(err));
                    setAudit(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [auditId, workspaces]);

    async function onRerun() {
        if (!audit) return;
        setRerunning(true);
        setError(null);
        try {
            const created = await startAudit(audit.project_id);
            router.push(`/audits/${created.id}`);
        } catch (err) {
            setError(errorMessage(err));
            setRerunning(false);
        }
    }

    if (loading) return <AuditSkeleton />;

    if (!audit) {
        return (
            <Card>
                <EmptyState
                    icon="fileText"
                    title="Auditoría no encontrada"
                    description={error ?? "Puede que no exista o que no tengas acceso."}
                    action={
                        <ButtonLink href="/" variant="secondary" icon="arrowLeft">
                            Volver al dashboard
                        </ButtonLink>
                    }
                />
            </Card>
        );
    }

    const result = audit.result;
    const title = context?.project.name ?? result?.brand ?? `Proyecto #${audit.project_id}`;
    const url = context?.project.url ?? result?.url;
    const previous = completedDesc(history).find((a) => a.id < audit.id)?.result ?? null;

    const breadcrumbs = [
        { label: "Workspaces", href: "/workspaces" },
        ...(context ? [{ label: context.workspace.name, href: `/workspaces/${context.workspace.id}` }] : []),
        { label: `Auditoría #${audit.id}` },
    ];

    return (
        <div className="space-y-8">
            <PageHeader
                breadcrumbs={breadcrumbs}
                title={title}
                description={
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <StatusBadge status={audit.status} />
                        <span>Auditoría #{audit.id}</span>
                        {url && (
                            <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900"
                            >
                                {hostname(url)}
                                <Icon name="external" className="size-3.5" />
                            </a>
                        )}
                    </div>
                }
                actions={
                    <>
                        {context && (
                            <ButtonLink href={`/workspaces/${context.workspace.id}`} variant="secondary">
                                Ver workspace
                            </ButtonLink>
                        )}
                        <Button icon="refresh" loading={rerunning} onClick={onRerun}>
                            {rerunning ? "Auditando…" : "Relanzar auditoría"}
                        </Button>
                    </>
                }
            />

            {rerunning && (
                <Alert tone="info" title="Nueva auditoría en curso">
                    Rastreando la web y consultando a Gemini con varios prompts. Puede tardar 1–2 minutos…
                </Alert>
            )}
            {error && <Alert tone="error">{error}</Alert>}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="min-w-0">
                    {audit.status === "failed" ? (
                        <Alert tone="error" title="La auditoría ha fallado">
                            {audit.error ?? "Error desconocido."} Puedes relanzarla cuando quieras.
                        </Alert>
                    ) : result ? (
                        <AuditResultCard result={result} previous={previous} />
                    ) : (
                        <Card>
                            <EmptyState
                                icon="clock"
                                title="Sin resultado todavía"
                                description="La auditoría aún no ha terminado. Recarga la página en unos minutos."
                            />
                        </Card>
                    )}
                </div>

                <aside className="space-y-6">
                    <Card>
                        <CardHeader title="Detalles" />
                        <dl className="divide-y divide-zinc-100 text-sm">
                            <DetailRow label="Estado" value={statusMeta(audit.status).label} />
                            {context && <DetailRow label="Workspace" value={context.workspace.name} />}
                            {result?.engines && (
                                <DetailRow
                                    label="Motores"
                                    value={result.engines.map((e) => e.name).join(", ")}
                                    capitalize
                                />
                            )}
                            {result?.method && <DetailRow label="Método" value={result.method} mono />}
                        </dl>
                    </Card>

                    {history.length > 0 && (
                        <Card>
                            <CardHeader title="Historial del proyecto" description={`${history.length} en total`} />
                            <ul className="p-2">
                                {history.map((a) => {
                                    const current = a.id === audit.id;
                                    return (
                                        <li key={a.id}>
                                            <Link
                                                href={`/audits/${a.id}`}
                                                aria-current={current ? "page" : undefined}
                                                className={cx(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                                    current ? "bg-zinc-100" : "hover:bg-zinc-50"
                                                )}
                                            >
                                                <span className="w-10 font-medium tabular-nums text-zinc-500">#{a.id}</span>
                                                <StatusBadge status={a.status} />
                                                <span className="ml-auto font-medium tabular-nums text-zinc-900">
                                                    {a.result ? pct(a.result.share_of_voice) : "—"}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    )}
                </aside>
            </div>
        </div>
    );
}

function DetailRow({
    label,
    value,
    mono,
    capitalize,
}: {
    label: string;
    value: string;
    mono?: boolean;
    capitalize?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 px-5 py-3">
            <dt className="text-zinc-500">{label}</dt>
            <dd
                className={cx(
                    "min-w-0 break-words text-right font-medium text-zinc-900",
                    mono && "font-mono text-xs",
                    capitalize && "capitalize"
                )}
            >
                {value}
            </dd>
        </div>
    );
}

function AuditSkeleton() {
    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-72" />
                <Skeleton className="h-4 w-56" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}
