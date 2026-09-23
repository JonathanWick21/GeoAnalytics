"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { me, logout, User } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    me()
      .then(setUser)
      .catch((err) => setError(String(err)));
  }, []);

  async function onLogout() {
    await logout();
    setUser(null);
    setError("Not authenticated");
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>GeoAnalytics</h1>
      {user ? (
        <>
          <p>Sesión: {user.email} (id {user.id})</p>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <p>{error ?? "cargando..."}</p>
          <Link href="/login">Ir a login</Link>
        </>
      )}
    </main>
  );
}