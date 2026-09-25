"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();

        setError(null);
        setLoading(true);

        try {
            await login(email, password);
            router.push('/');
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }


    return (
        <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 400 }}>
            <h1>Login</h1>
            <form onSubmit={onSubmit}>
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ display: "block", width: "100%", marginBottom: 12 }}
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        style={{ display: "block", width: "100%", marginBottom: 12 }}
                    />
                </label>
                <button type="submit" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                </button>
            </form>
        </main>
    )
}