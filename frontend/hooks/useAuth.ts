"use client";
import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("rag_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("rag_token", data.access_token);
      localStorage.setItem("rag_user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    }
    return { success: false, message: data.message || "Login failed" };
  };

  const logout = () => {
    localStorage.removeItem("rag_token");
    localStorage.removeItem("rag_user");
    setUser(null);
    window.location.href = "/admin/login";
  };

  const getToken = () => localStorage.getItem("rag_token");

  return { user, loading, login, logout, getToken };
}