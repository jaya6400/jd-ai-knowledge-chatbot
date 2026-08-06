"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare, HelpCircle, LogOut, Upload, TrendingUp } from "lucide-react";

interface Stats {
  total_pdfs: number;
  processing: number;
  total_questions: number;
  total_sessions: number;
}

interface Doc {
  id: string;
  original_name: string;
  status: string;
  upload_date: string;
}

export default function DashboardPage() {
  const { user, getToken, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/admin/login");
      return;
    }
    fetchStats();
    fetchRecentDocs();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [docRes, chatRes] = await Promise.all([
        fetch("/api/documents/stats/all", { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch("/api/chat/stats"),
      ]);
      const docData = await docRes.json();
      const chatData = await chatRes.json();
      setStats({ ...docData, ...chatData });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecentDocs = async () => {
    try {
      const res = await fetch("/api/documents", { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setRecentDocs(data.slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg">RAG Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total PDFs</p>
                  <p className="text-3xl font-bold">{stats?.total_pdfs ?? 0}</p>
                </div>
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Chat Sessions</p>
                  <p className="text-3xl font-bold">{stats?.total_sessions ?? 0}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Questions Asked</p>
                  <p className="text-3xl font-bold">{stats?.total_questions ?? 0}</p>
                </div>
                <HelpCircle className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Processing</p>
                  <p className="text-3xl font-bold">{stats?.processing ?? 0}</p>
                </div>
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Documents</h2>
          <Button onClick={() => router.push("/admin/documents")}>View All</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-sm">{doc.original_name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={doc.status === "completed" ? "success" : doc.status === "failed" ? "destructive" : "secondary"}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(doc.upload_date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentDocs.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No documents uploaded yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
