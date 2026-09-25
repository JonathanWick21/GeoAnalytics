"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  me,
  logout,
  listWorkspaces,
  createWorkspace,
  User,
  Workspace,
} from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const u = await me();
      setUser(u);
    } catch {
      setUser(null);
      setWorkspaces([]);
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    try {
      const ws = await listWorkspaces();
      setWorkspaces(ws);
    } catch (err) {
      setError(`Workspaces: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onLogout() {
    await logout();
    setUser(null);
    setWorkspaces([]);
    setError("Not authenticated");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createWorkspace(name.trim());
      setName("");
      const ws = await listWorkspaces();
      setWorkspaces(ws);
    } catch (err) {
      setError(String(err));
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 32, fontFamily: "system-ui" }}>
        <p>Cargando...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>GeoAnalytics</h1>
        <p>{error}</p>
        <Link href="/login">Ir a login</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 560 }}>
      <h1>GeoAnalytics</h1>
      <p>
        Sesión: {user.email}{" "}
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </p>

      <h2>Workspaces</h2>
      {workspaces.length === 0 ? (
        <p>No tienes workspaces aún.</p>
      ) : (
        <ul>
          {workspaces.map((w) => (
            <li key={w.id}>
              <Link href={`/workspaces/${w.id}`}>{w.name}</Link>
              <small>(id {w.id})</small>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onCreate} style={{ marginTop: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del workspace"
          required
          style={{ marginRight: 8 }}
        />
        <button type="submit">Crear</button>
      </form>
      {error && user && <pre style={{ color: "crimson" }}>{error}</pre>}
    </main>
  );
}