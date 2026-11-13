"use client";

import { Suspense, SubmitEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { errorMessage, login, me, register } from "@/lib/api";
import { Icon, IconName } from "@/components/icons";
import { Alert, Button, Field, Input, Logo, cx } from "@/components/ui";

type Mode = "login" | "register";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
    {
        icon: "target",
        title: "Share of voice en IA",
        text: "Descubre en qué porcentaje de respuestas los asistentes mencionan tu marca.",
    },
    {
        icon: "globe",
        title: "Análisis de tu web",
        text: "Rastreamos tu sitio para generar los prompts que haría un cliente real.",
    },
    {
        icon: "lightbulb",
        title: "Recomendaciones accionables",
        text: "Qué cambiar en tu contenido para aparecer más en motores generativos.",
    },
];

export default function LoginPage() {
    return (
        <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <BrandPanel />
            <section className="flex items-center justify-center px-4 py-12 sm:px-8">
                <Suspense>
                    <AuthForm />
                </Suspense>
            </section>
        </div>
    );
}

function BrandPanel() {
    return (
        <section
            className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between"
            style={{
                backgroundImage:
                    "radial-gradient(60rem 40rem at 120% -10%, rgba(45,212,191,0.22), transparent 60%), radial-gradient(40rem 30rem at -20% 110%, rgba(42,120,214,0.25), transparent 60%)",
            }}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div className="relative">
                <Logo tone="light" />
            </div>

            <div className="relative max-w-md">
                <p className="text-sm font-medium text-brand-300">Generative Engine Optimization</p>
                <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
                    Mide cómo te ven los asistentes de IA.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/70">
                    Audita la visibilidad de tus marcas en las respuestas de modelos generativos y sigue su evolución
                    auditoría a auditoría.
                </p>

                <ul className="mt-10 space-y-6">
                    {FEATURES.map((f) => (
                        <li key={f.title} className="flex gap-4">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-200 ring-1 ring-white/15">
                                <Icon name={f.icon} className="size-5" />
                            </span>
                            <div>
                                <p className="font-medium">{f.title}</p>
                                <p className="mt-0.5 text-sm text-white/60">{f.text}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <p className="relative text-xs text-white/40">© {new Date().getFullYear()} GeoAnalytics</p>
        </section>
    );
}

function safeNext(next: string | null) {
    return next && next.startsWith("/") && !next.startsWith("//") && next !== "/login" ? next : "/";
}

function AuthForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = safeNext(searchParams.get("next"));

    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Si ya hay sesión, no tiene sentido mostrar el login
    useEffect(() => {
        me()
            .then(() => router.replace(next))
            .catch(() => undefined);
    }, [router, next]);

    function switchMode(m: Mode) {
        setMode(m);
        setError(null);
        setConfirm("");
    }

    async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (mode === "register" && password !== confirm) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        try {
            if (mode === "register") {
                await register(email, password);
            }
            await login(email, password);
            router.replace(next);
        } catch (err) {
            setError(errorMessage(err));
            setLoading(false);
        }
    }

    const isLogin = mode === "login";

    return (
        <div className="w-full max-w-sm">
            <div className="mb-10 lg:hidden">
                <Logo />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
                {isLogin
                    ? "Inicia sesión para ver tus auditorías."
                    : "Empieza a medir la visibilidad de tu marca en IA."}
            </p>

            <div role="tablist" className="mt-8 grid grid-cols-2 rounded-lg bg-zinc-100 p-1 text-sm font-medium">
                {(["login", "register"] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={mode === m}
                        onClick={() => switchMode(m)}
                        className={cx(
                            "rounded-md py-1.5 transition",
                            mode === m ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                        )}
                    >
                        {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
                    </button>
                ))}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field label="Email" htmlFor="email">
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="tu@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </Field>

                <Field
                    label="Contraseña"
                    htmlFor="password"
                    hint={!isLogin ? "Mínimo 6 caracteres." : undefined}
                >
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-700"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            <Icon name={showPassword ? "eyeOff" : "eye"} className="size-4" />
                        </button>
                    </div>
                </Field>

                {!isLogin && (
                    <Field label="Repite la contraseña" htmlFor="confirm">
                        <Input
                            id="confirm"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            minLength={6}
                        />
                    </Field>
                )}

                {error && <Alert tone="error">{error}</Alert>}

                <Button type="submit" size="lg" loading={loading} className="w-full">
                    {loading
                        ? isLogin
                            ? "Entrando…"
                            : "Creando cuenta…"
                        : isLogin
                          ? "Iniciar sesión"
                          : "Crear cuenta"}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
                {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                <button
                    type="button"
                    onClick={() => switchMode(isLogin ? "register" : "login")}
                    className="font-medium text-brand-700 hover:text-brand-800"
                >
                    {isLogin ? "Regístrate" : "Inicia sesión"}
                </button>
            </p>
        </div>
    );
}
