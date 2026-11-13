"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { me, logout, listWorkspaces, User, Workspace } from "@/lib/api";
import { Icon, IconName } from "@/components/icons";
import { Avatar, Logo, Spinner, cx } from "@/components/ui";

type Session = {
    user: User;
    workspaces: Workspace[];
    refreshWorkspaces: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function useSession() {
    const session = useContext(SessionContext);
    if (!session) throw new Error("useSession debe usarse dentro de <AppShell>");
    return session;
}

export function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [navOpen, setNavOpen] = useState(false);

    const refreshWorkspaces = useCallback(async () => {
        setWorkspaces(await listWorkspaces());
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const u = await me();
                const ws = await listWorkspaces().catch(() => []);
                if (cancelled) return;
                setWorkspaces(ws);
                setUser(u);
            } catch {
                if (!cancelled) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
            }
        })();
        return () => {
            cancelled = true;
        };
        // Solo al montar: la sesión no cambia al navegar entre páginas
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setNavOpen(false);
    }, [pathname]);

    async function onLogout() {
        await logout().catch(() => undefined);
        router.replace("/login");
    }

    if (!user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <Logo />
                <Spinner className="size-5 text-brand-700" />
            </div>
        );
    }

    return (
        <SessionContext.Provider value={{ user, workspaces, refreshWorkspaces }}>
            <div className="min-h-screen">
                <aside
                    className={cx(
                        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform lg:translate-x-0",
                        navOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <div className="flex h-16 items-center justify-between px-5">
                        <Link href="/">
                            <Logo />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setNavOpen(false)}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 lg:hidden"
                            aria-label="Cerrar menú"
                        >
                            <Icon name="x" className="size-5" />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
                        <div className="space-y-0.5">
                            <NavItem href="/" icon="dashboard" active={pathname === "/"}>
                                Dashboard
                            </NavItem>
                            <NavItem href="/workspaces" icon="folder" active={pathname === "/workspaces"}>
                                Workspaces
                            </NavItem>
                        </div>

                        <div>
                            <div className="flex items-center justify-between px-3 pb-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                                    Tus workspaces
                                </span>
                                <Link
                                    href="/workspaces"
                                    className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                    aria-label="Nuevo workspace"
                                    title="Nuevo workspace"
                                >
                                    <Icon name="plus" className="size-4" />
                                </Link>
                            </div>
                            {workspaces.length === 0 ? (
                                <p className="px-3 text-sm text-zinc-400">Aún no tienes ninguno.</p>
                            ) : (
                                <ul className="space-y-0.5">
                                    {workspaces.map((w) => {
                                        const href = `/workspaces/${w.id}`;
                                        const active = pathname === href;
                                        return (
                                            <li key={w.id}>
                                                <Link
                                                    href={href}
                                                    className={cx(
                                                        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                                                        active
                                                            ? "bg-zinc-100 font-medium text-zinc-900"
                                                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                                    )}
                                                >
                                                    <Avatar name={w.name} className="size-6 rounded-md text-[10px]" />
                                                    <span className="truncate">{w.name}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </nav>

                    <div className="border-t border-zinc-200 p-3">
                        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                                {user.email.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-900">{user.email}</p>
                                <p className="text-xs text-zinc-500">Cuenta personal</p>
                            </div>
                            <button
                                type="button"
                                onClick={onLogout}
                                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                                aria-label="Cerrar sesión"
                                title="Cerrar sesión"
                            >
                                <Icon name="logout" className="size-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {navOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-zinc-900/30 backdrop-blur-[1px] lg:hidden"
                        onClick={() => setNavOpen(false)}
                        aria-hidden="true"
                    />
                )}

                <div className="lg:pl-64">
                    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
                        <button
                            type="button"
                            onClick={() => setNavOpen(true)}
                            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
                            aria-label="Abrir menú"
                        >
                            <Icon name="menu" className="size-5" />
                        </button>
                        <Logo />
                    </header>
                    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
                </div>
            </div>
        </SessionContext.Provider>
    );
}

function NavItem({
    href,
    icon,
    active,
    children,
}: {
    href: string;
    icon: IconName;
    active: boolean;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-800" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
        >
            <Icon name={icon} className={cx("size-[18px]", active ? "text-brand-700" : "text-zinc-400")} />
            {children}
        </Link>
    );
}
