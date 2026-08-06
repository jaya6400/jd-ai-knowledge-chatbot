"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogOut, Upload, Search, Trash2, RefreshCw, FileText, ArrowLeft } from "lucide-react";

interface Doc {
  id: string;
  original_name: string;
  filename: string;
  status: string;
  upload_date: string;
  page_count: number | null;
}

export default function DocumentsPage() {
  const { user, loading: authLoading, getToken, logout } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/admin/login");
      return;
    }
    fetchDocs();
  }, [user, authLoading, router]);

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/documents", { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setDocs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch("/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      fetchDocs();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}/reprocess`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = docs.filter((d) => d.original_name.toLowerCase().includes(search.toLowerCase()));

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="font-bold text-lg">Documents</h1>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload PDF"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Document</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Pages</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">Date</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-medium">{doc.original_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={doc.status === "completed" ? "success" : doc.status === "failed" ? "destructive" : "secondary"}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{doc.page_count ?? "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(doc.upload_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleReprocess(doc.id)} title="Reprocess">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} title="Delete">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}