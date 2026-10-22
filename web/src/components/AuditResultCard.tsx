"use client";

import type { AuditResult } from "@/lib/api";

function pct(n: number | undefined) {
    if (typeof n !== "number" || Number.isNaN(n)) return "—";
    return `${Math.round(n * 100)}%`;
}

export function AuditResultCard({ result }: { result: AuditResult }) {
    return (
        <div
            style={{
                marginTop: 12,
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#fafafa",
                color: "#111827"
            }}
        >
            {result.summary && (
                <p style={{ margin: "0 0 16px", lineHeight: 1.5, color: "#111827" }}>{result.summary}</p>
            )}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                <div style={{ padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #eee" }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Share of voice</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{pct(result.share_of_voice)}</div>
                </div>
                <div style={{ padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #eee" }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Menciones (est.)</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{result.mentions ?? "—"}</div>
                </div>
            </div>
            {result.engines && result.engines.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Motores</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {result.engines.map((e) => (
                            <div
                                key={e.name}
                                style={{
                                    flex: "1 1 120px",
                                    padding: 10,
                                    background: "#fff",
                                    borderRadius: 6,
                                    border: "1px solid #eee",
                                }}
                            >
                                <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{e.name}</div>
                                <div style={{ fontSize: 12, color: e.mentioned ? "#047857" : "#9ca3af" }}>
                                    {e.mentioned ? "Mencionada" : "No mencionada"}
                                </div>
                                <div style={{ marginTop: 4 }}>{pct(e.score)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {result.recommendations && result.recommendations.length > 0 && (
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                        Recomendaciones
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.45 }}>
                        {result.recommendations.map((r, i) => (
                            <li key={i} style={{ marginBottom: 6 }}>
                                {r}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}