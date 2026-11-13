import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Icon, IconName } from "@/components/icons";
import { initials, statusMeta } from "@/lib/format";

export function cx(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

export function buttonClasses(variant: Variant = "primary", size: Size = "md") {
    return cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-9 px-3.5 text-sm",
        size === "lg" && "h-11 px-5 text-sm",
        variant === "primary" && "bg-brand-700 text-white shadow-xs hover:bg-brand-800",
        variant === "secondary" && "border border-zinc-200 bg-white text-zinc-800 shadow-xs hover:bg-zinc-50",
        variant === "ghost" && "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
    );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: IconName;
};

export function Button({
    variant,
    size,
    loading,
    icon,
    className,
    children,
    disabled,
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={cx(buttonClasses(variant, size), className)}
            {...props}
        >
            {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
            {children}
        </button>
    );
}

export function ButtonLink({
    href,
    variant,
    size,
    icon,
    className,
    children,
}: {
    href: string;
    variant?: Variant;
    size?: Size;
    icon?: IconName;
    className?: string;
    children: ReactNode;
}) {
    return (
        <Link href={href} className={cx(buttonClasses(variant, size), className)}>
            {icon && <Icon name={icon} />}
            {children}
        </Link>
    );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cx("inline-block animate-spin rounded-full border-2 border-current border-r-transparent", className)}
        />
    );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className={cx("rounded-xl border border-zinc-200 bg-white shadow-xs", className)}>
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    description,
    action,
}: {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

export function TileLabel({ icon, children }: { icon: IconName; children: ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
            <Icon name={icon} className="size-4 text-zinc-400" />
            {children}
        </div>
    );
}

export type Crumb = { label: string; href?: string };

export function PageHeader({
    title,
    description,
    actions,
    breadcrumbs,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    breadcrumbs?: Crumb[];
}) {
    return (
        <div className="space-y-3">
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
                    {breadcrumbs.map((c, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {i > 0 && <Icon name="chevronRight" className="size-3.5 text-zinc-300" />}
                            {c.href ? (
                                <Link href={c.href} className="hover:text-zinc-900">
                                    {c.label}
                                </Link>
                            ) : (
                                <span className="text-zinc-700">{c.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
                    {description && <div className="mt-1 text-sm text-zinc-500">{description}</div>}
                </div>
                {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cx(
                "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-xs",
                "placeholder:text-zinc-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/10",
                className
            )}
            {...props}
        />
    );
}

export function Field({
    label,
    htmlFor,
    hint,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700">
                {label}
            </label>
            {children}
            {hint && <p className="text-xs text-zinc-500">{hint}</p>}
        </div>
    );
}

const ALERT_TONES = {
    error: { box: "border-red-200 bg-red-50 text-red-900", icon: "alert", iconColor: "text-red-600" },
    warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "alert", iconColor: "text-amber-600" },
    info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: "info", iconColor: "text-sky-600" },
    success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "check", iconColor: "text-emerald-600" },
} as const;

export function Alert({
    tone = "error",
    title,
    children,
    action,
}: {
    tone?: keyof typeof ALERT_TONES;
    title?: ReactNode;
    children?: ReactNode;
    action?: ReactNode;
}) {
    const t = ALERT_TONES[tone];
    return (
        <div role={tone === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm", t.box)}>
            <Icon name={t.icon} className={cx("mt-0.5 size-4 shrink-0", t.iconColor)} />
            <div className="min-w-0 flex-1">
                {title && <p className="font-medium">{title}</p>}
                {children && <div className={cx("break-words opacity-90", title ? "mt-0.5" : null)}>{children}</div>}
            </div>
            {action && <div className="shrink-0 self-center">{action}</div>}
        </div>
    );
}

export function StatusBadge({ status }: { status: string }) {
    const meta = statusMeta(status);
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700">
            {status === "running" ? (
                <Spinner className="size-3 text-zinc-500" />
            ) : (
                <Icon name={meta.icon} className="size-3" />
            )}
            <span className="sr-only">Estado:</span>
            <span>{meta.label}</span>
            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
        </span>
    );
}

/** Barra de proporción 0–1 (share of voice, score). */
export function Meter({ value, className, label }: { value: number; className?: string; label?: string }) {
    const v = Math.max(0, Math.min(1, value));
    return (
        <div
            role="img"
            aria-label={label ?? `${Math.round(v * 100)}%`}
            className={cx("h-2 w-full overflow-hidden rounded-full bg-zinc-100", className)}
        >
            <div className="h-full rounded-full bg-data transition-[width] duration-500" style={{ width: `${v * 100}%` }} />
        </div>
    );
}

/** Variación en puntos porcentuales respecto a la auditoría anterior. */
export function Delta({ value }: { value: number | null | undefined }) {
    if (typeof value !== "number") return null;
    const points = Math.round(value * 100);
    if (points === 0) {
        return <span className="text-xs font-medium text-zinc-500">= 0 pp</span>;
    }
    const up = points > 0;
    return (
        <span
            className={cx("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-emerald-700" : "text-red-700")}
            title="Respecto a la auditoría anterior"
        >
            <Icon name={up ? "arrowUp" : "arrowDown"} className="size-3" />
            {up ? "+" : "−"}
            {Math.abs(points)} pp
        </span>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cx("animate-pulse rounded-md bg-zinc-200/70", className)} />;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon: IconName;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cx("flex flex-col items-center px-6 py-10 text-center", className)}>
            <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                <Icon name={icon} className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-900">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cx(
                "inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-100",
                className ?? "size-9 text-sm"
            )}
        >
            {initials(name)}
        </span>
    );
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
    return (
        <span className="inline-flex items-center gap-2.5">
            <span
                className={cx(
                    "flex size-8 items-center justify-center rounded-lg",
                    tone === "dark" ? "bg-brand-700 text-white" : "bg-white/10 text-brand-200 ring-1 ring-white/20"
                )}
            >
                <Icon name="globe" className="size-[18px]" />
            </span>
            <span className={cx("text-[15px] font-semibold tracking-tight", tone === "dark" ? "text-zinc-900" : "text-white")}>
                GeoAnalytics
            </span>
        </span>
    );
}
