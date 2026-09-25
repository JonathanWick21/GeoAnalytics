"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { me, listProjects, createProject, Project } from "@/lib/api";

export default function WorkspaceDetailPage() {
    const params = useParams();
    const workspaceId = Number(params.id);

    const [projects, setProjects] = useState<Project[]>([]);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            await me();
            const list = await listProjects(workspaceId);
            setProjects(list);
        } catch (err) {
            setError(String(err));
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!Number.isFinite(workspaceId)) return;
        load();
    }, [workspaceId]);

    async function onCreate(e: FormEvent) {
        e.preventDefault();

        try {
            await createProject(name, url, workspaceId);
            setName("");
            setUrl("");
            await load();
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

    return (
        <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 560 }}>
          <p>
            <Link href="/">← Workspaces</Link>
          </p>
          <h1>Workspace #{workspaceId}</h1>
          {error && <pre style={{ color: "crimson" }}>{error}</pre>}
          <h2>Projects</h2>
          {projects.length === 0 ? (
            <p>No hay projects aún.</p>
          ) : (
            <ul>
              {projects.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong> — {p.url}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={onCreate} style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre"
                required
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                required
                style={{ width: "100%" }}
              />
            </div>
            <button type="submit">Crear project</button>
          </form>
        </main>
      );
}