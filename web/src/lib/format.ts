import type { Audit, AuditResult } from "@/lib/api";
import type { IconName } from "@/components/icons";

export type CompletedAudit = Audit & { result: AuditResult };

export function pct(n: number | null | undefined) {
    if (typeof n !== "number" || Number.isNaN(n)) return "—";
    return `${Math.round(n * 100)}%`;
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
    return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function hostname(url: string) {
    try {
        const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
        return u.hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

export function initials(text: string) {
    const parts = text.trim().split(/[\s@._-]+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
    return letters.toUpperCase();
}

export function isCompleted(a: Audit): a is CompletedAudit {
    return a.status === "completed" && a.result !== null;
}

/** Auditorías completadas, de la más reciente a la más antigua. */
export function completedDesc(audits: Audit[]) {
    return audits.filter(isCompleted).sort((a, b) => b.id - a.id);
}

/** Menciones / total de prompts. Si no hay detalle por prompt, usa `mentions`. */
export function promptStats(result: AuditResult) {
    const list = result.prompt_results;
    if (list && list.length > 0) {
        return { hits: list.filter((p) => p.mentioned).length, total: list.length };
    }
    return { hits: result.mentions ?? 0, total: 0 };
}

export const STATUS: Record<string, { label: string; icon: IconName; color: string }> = {
    completed: { label: "Completada", icon: "check", color: "var(--color-good)" },
    failed: { label: "Fallida", icon: "x", color: "var(--color-critical)" },
    running: { label: "En curso", icon: "clock", color: "var(--color-warning)" },
    pending: { label: "Pendiente", icon: "clock", color: "var(--color-zinc-400)" },
};

export function statusMeta(status: string) {
    return STATUS[status] ?? { label: status, icon: "info" as IconName, color: "var(--color-zinc-400)" };
}
