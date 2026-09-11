"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";

export default function Home() {
  const [ status, setStatus ] = useState<string>("cargando...")
  const [ error, setError ] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`, {credentials: "include"})
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setStatus(JSON.stringify(data)))
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <main>
      <h1>GeoAnalytics</h1>
      <p>Comprobación de la API:</p>
      {error ? <pre>Error: {error}</pre> : <pre>{status}</pre>}
    </main>
  );
}

