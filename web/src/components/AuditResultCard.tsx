"use client";

import type { AuditResult } from "@/lib/api";
import { Icon } from "@/components/icons";
import { Alert, Card, CardHeader, Delta, Meter, TileLabel, cx } from "@/components/ui";
import { pct, promptStats } from "@/lib/format";

export function AuditResultCard({
    result,
    previous,
}: {
    result: AuditResult;
    /** Resultado de la auditoría completada anterior, para mostrar la variación. */
    previous?: AuditResult | null;
}) {
    const { hits, total } = promptStats(result);
    const delta = previous ? result.share_of_voice - previous.share_of_voice : null;
    const prompts = result.prompt_results ?? [];

    return (
        <div className="space-y-6">
            {result.demo && (
                <Alert tone="info" title="Resultado de demostración">
                    Esta auditoría se generó en modo demo; las métricas son simuladas.
                </Alert>
            )}
            {result.crawl_warning && (
                <Alert tone="warning" title="No se pudo rastrear la web">
                    {result.crawl_warning}. Los prompts se generaron sin el contenido del sitio.
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-5">
                    <TileLabel icon="target">Share of voice</TileLabel>
                    <div className="mt-3 flex items-baseline gap-3">
                        <span className="text-5xl font-semibold tracking-tight text-zinc-900">
                            {pct(result.share_of_voice)}
                        </span>
                        <Delta value={delta} />
                    </div>
                    <Meter value={result.share_of_voice} className="mt-4" />
                    <p className="mt-2 text-xs text-zinc-500">
                        {delta !== null ? "Variación respecto a la auditoría anterior" : "Primera auditoría completada"}
                    </p>
                </Card>

                <Card className="p-5">
                    <TileLabel icon="message">Menciones</TileLabel>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tracking-tight text-zinc-900">{hits}</span>
                        {total > 0 && <span className="text-sm text-zinc-500">de {total} prompts</span>}
                    </div>
                    {prompts.length > 0 && (
                        <div
                            className="mt-4 flex h-2 gap-0.5"
                            role="img"
                            aria-label={`${hits} de ${total} prompts mencionan la marca`}
                        >
                            {prompts.map((p, i) => (
                                <span
                                    key={i}
                                    className={cx("flex-1 rounded-full", p.mentioned ? "bg-good" : "bg-zinc-200")}
                                />
                            ))}
                        </div>
                    )}
                    <p className="mt-2 text-xs text-zinc-500">Respuestas de la IA que citan la marca</p>
                </Card>

                <Card className="p-5">
                    <TileLabel icon="fileText">Contenido analizado</TileLabel>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tracking-tight text-zinc-900">
                            {typeof result.source_chars === "number"
                                ? result.source_chars.toLocaleString("es-ES")
                                : "—"}
                        </span>
                        <span className="text-sm text-zinc-500">caracteres</span>
                    </div>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                        <Icon
                            name={result.grounded ? "check" : "alert"}
                            className={cx("size-3.5", result.grounded ? "text-emerald-600" : "text-amber-600")}
                        />
                        {result.grounded ? "Prompts basados en tu web" : "Sin contenido de la web"}
                    </p>
                </Card>
            </div>

            {result.summary && (
                <Card className="p-5">
                    <TileLabel icon="sparkles">Resumen</TileLabel>
                    <p className="mt-2 text-[15px] leading-relaxed text-zinc-700">{result.summary}</p>
                </Card>
            )}

            {prompts.length > 0 && (
                <Card>
                    <CardHeader
                        title="Prompts medidos"
                        description="Preguntas que haría un usuario real. Comprobamos si la respuesta menciona la marca."
                        action={
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                                {hits}/{total} mencionan
                            </span>
                        }
                    />
                    <ul className="divide-y divide-zinc-100">
                        {prompts.map((p, i) => (
                            <li key={i} className="flex gap-3 px-5 py-4">
                                <span
                                    className={cx(
                                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                                        p.mentioned ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                                    )}
                                >
                                    <Icon name={p.mentioned ? "check" : "x"} className="size-3.5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-zinc-900">{p.prompt}</p>
                                    <p className="mt-0.5 text-xs text-zinc-500">
                                        {p.mentioned ? "La respuesta menciona la marca" : "La respuesta no menciona la marca"}
                                    </p>
                                    {p.answer_excerpt && (
                                        <details className="group mt-2">
                                            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 [&::-webkit-details-marker]:hidden">
                                                <Icon name="chevronRight" className="size-3.5 transition-transform group-open:rotate-90" />
                                                Ver respuesta
                                            </summary>
                                            <blockquote className="mt-2 whitespace-pre-wrap rounded-lg border-l-2 border-zinc-300 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-600">
                                                {p.answer_excerpt}
                                            </blockquote>
                                        </details>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {result.engines && result.engines.length > 0 && (
                <Card>
                    <CardHeader title="Motores de IA" description="Visibilidad por motor generativo consultado." />
                    <ul className="divide-y divide-zinc-100">
                        {result.engines.map((e) => (
                            <li key={e.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                                <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                                    <Icon name="bot" className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium capitalize text-zinc-900">{e.name}</p>
                                    <p className="inline-flex items-center gap-1 text-xs text-zinc-500">
                                        <Icon
                                            name={e.mentioned ? "check" : "x"}
                                            className={cx("size-3", e.mentioned ? "text-emerald-600" : "text-zinc-400")}
                                        />
                                        {e.mentioned ? "Menciona la marca" : "No menciona la marca"}
                                    </p>
                                </div>
                                <div className="flex w-full items-center gap-3 sm:w-56">
                                    <Meter value={e.score} />
                                    <span className="w-10 text-right text-sm font-medium tabular-nums text-zinc-900">
                                        {pct(e.score)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
                <Card>
                    <CardHeader
                        title="Recomendaciones"
                        description="Acciones sugeridas para mejorar la visibilidad de la marca."
                    />
                    <ol className="divide-y divide-zinc-100">
                        {result.recommendations.map((r, i) => (
                            <li key={i} className="flex gap-4 px-5 py-4">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                                    {i + 1}
                                </span>
                                <p className="text-sm leading-relaxed text-zinc-700">{r}</p>
                            </li>
                        ))}
                    </ol>
                </Card>
            )}
        </div>
    );
}
