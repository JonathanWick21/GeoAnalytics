"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { me, listProjects, createProject, Project, startAudit, listAudits, Audit } from "@/lib/api";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = Number(params.id);

  const [projects, setProjects] = useState<Project[]>([]);
  const [auditsByProjects, setAuditsByProjects] = useState<Record<number, Audit[]>>({});
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

      const entries = await Promise.all(
        list.map(async (p) => {
          const audits = await listAudits(p.id);
          return [p.id, audits] as const;
        })
      );
      setAuditsByProjects(Object.fromEntries(entries));
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

              <div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await startAudit(p.id);
                      await load();
                    } catch (err) {
                      setError(String(err));
                    }
                  }}
                >
                  Lanzar auditoría
                </button>
              </div>

              {/* ↓↓↓ AQUÍ: audits de ESTE project */}
              <ul style={{ marginTop: 8 }}>
                {(auditsByProjects[p.id] ?? []).length === 0 ? (
                  <li>Sin auditorías aún.</li>
                ) : (
                  (auditsByProjects[p.id] ?? []).map((a) => (
                    <li key={a.id}>
                      Audit #{a.id}: <strong>{a.status}</strong>
                      {a.result && (
                        <pre style={{ fontSize: 12, background: "#f4f4f4", padding: 8 }}>
                          {JSON.stringify(a.result, null, 2)}
                        </pre>
                      )}
                      {a.error && (
                        <span style={{ color: "crimson" }}> — {a.error}</span>
                      )}
                    </li>
                  ))
                )}
              </ul>
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