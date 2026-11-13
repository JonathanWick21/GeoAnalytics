"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectWithAudits } from "@/lib/overview";
import { completedDesc, hostname, pct, plural, promptStats } from "@/lib/format";
import { Icon } from "@/components/icons";
import { Avatar, Button, Card, Delta, Meter, StatusBadge } from "@/components/ui";

const VISIBLE_AUDITS = 4;

export function ProjectCard({
    project,
    auditing,
    disabled,
    onAudit,
}: {
    project: ProjectWithAudits;
    auditing: boolean;
    disabled: boolean;
    onAudit: () => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const audits = [...project.audits].sort((a, b) => b.id - a.id);
    const [latest, previous] = completedDesc(audits);
    const stats = latest ? promptStats(latest.result) : null;
    const visible = showAll ? audits : audits.slice(0, VISIBLE_AUDITS);

    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={project.name} className="size-10 text-sm" />
                    <div className="min-w-0">
                        <h3 className="truncate font-semibold text-zinc-900">{project.name}</h3>
                        <a
                            href={project.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1 truncate text-sm text-zinc-500 hover:text-zinc-900"
                        >
                            <span className="truncate">{hostname(project.url)}</span>
                            <Icon name="external" className="size-3.5 shrink-0" />
                        </a>
                    </div>
                </div>
                <Button
                    icon="sparkles"
                    loading={auditing}
                    disabled={disabled}
                    onClick={onAudit}
                    className="self-start sm:self-auto"
                >
                    {auditing ? "Auditando…" : "Lanzar auditoría"}
                </Button>
            </div>

            {auditing && (
                <div className="border-t border-zinc-100 bg-brand-50/50 px-5 py-3">
                    <div className="h-1 overflow-hidden rounded-full bg-brand-100">
                        <div className="animate-progress h-full w-2/5 rounded-full bg-brand-600" />
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                        Rastreando la web y consultando a Gemini con varios prompts. Puede tardar 1–2 minutos…
                    </p>
                </div>
            )}

            <dl className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100">
                <div className="px-5 py-4">
                    <dt className="text-xs text-zinc-500">Share of voice</dt>
                    <dd className="mt-1 flex items-baseline gap-2">
                        <span className="text-xl font-semibold text-zinc-900">{pct(latest?.result.share_of_voice)}</span>
                        {previous && <Delta value={latest.result.share_of_voice - previous.result.share_of_voice} />}
                    </dd>
                </div>
                <div className="px-5 py-4">
                    <dt className="text-xs text-zinc-500">Menciones</dt>
                    <dd className="mt-1 text-xl font-semibold text-zinc-900">
                        {stats ? (stats.total ? `${stats.hits}/${stats.total}` : stats.hits) : "—"}
                    </dd>
                </div>
                <div className="px-5 py-4">
                    <dt className="text-xs text-zinc-500">Auditorías</dt>
                    <dd className="mt-1 text-xl font-semibold text-zinc-900">{audits.length}</dd>
                </div>
            </dl>

            <div className="border-t border-zinc-100 px-2 py-2">
                {audits.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-zinc-500">
                        Aún no hay auditorías. Lanza la primera para medir la visibilidad de la marca.
                    </p>
                ) : (
                    <>
                        <ul>
                            {visible.map((a) => (
                                <li key={a.id}>
                                    <Link
                                        href={`/audits/${a.id}`}
                                        className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50"
                                    >
                                        <span className="w-10 shrink-0 font-medium tabular-nums text-zinc-500">#{a.id}</span>
                                        <StatusBadge status={a.status} />
                                        <div className="ml-auto flex min-w-0 items-center gap-3">
                                            {a.result ? (
                                                <>
                                                    <Meter value={a.result.share_of_voice} className="hidden w-28 sm:block" />
                                                    <span className="w-10 text-right font-medium tabular-nums text-zinc-900">
                                                        {pct(a.result.share_of_voice)}
                                                    </span>
                                                </>
                                            ) : a.error ? (
                                                <span className="truncate text-xs text-zinc-500">{a.error}</span>
                                            ) : null}
                                            <Icon
                                                name="chevronRight"
                                                className="size-4 shrink-0 text-zinc-300 group-hover:text-zinc-500"
                                            />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        {audits.length > VISIBLE_AUDITS && (
                            <button
                                type="button"
                                onClick={() => setShowAll((v) => !v)}
                                className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                            >
                                {showAll ? "Mostrar menos" : `Ver ${plural(audits.length, "auditoría")}`}
                            </button>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
}
