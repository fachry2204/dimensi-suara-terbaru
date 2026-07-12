"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Shield, Users } from "lucide-react";
import { UserContractStatus } from "@/components/admin/users/UserContractStatus";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"user" | "admin">("user");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  const filtered = useMemo(
    () => users.filter((user) => (activeTab === "admin" ? user.role === "Admin" || user.role === "Operator" : user.role === "User")),
    [activeTab, users]
  );

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getContractStatusLabel = (value?: string | null) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "none" || normalized === "belum ada" || normalized === "pending") return "Pending";
    if (["review", "generated", "generate", "sudah generate", "sudah generat"].includes(normalized)) return "Review";
    if (["berhasil", "completed", "complete", "selesai", "signed", "done"].includes(normalized)) return "Berhasil";
    return value || "Pending";
  };

  const getUserStatusClass = (value?: string | null) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (["approved", "active", "di approved"].includes(normalized)) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (["pending", "review", "di riview"].includes(normalized)) return "bg-amber-50 text-amber-700 border-amber-100";
    if (["rejected", "di tolak"].includes(normalized)) return "bg-red-50 text-red-700 border-red-100";
    if (normalized === "blocked") return "bg-slate-100 text-slate-700 border-slate-200";
    return "bg-blue-50 text-blue-700 border-blue-100";
  };

  const getContractStatusClass = (value?: string | null) => {
    const label = getContractStatusLabel(value).toLowerCase();
    if (label === "berhasil") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (label === "review") return "bg-blue-50 text-blue-700 border-blue-100";
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  const getRoleBadgeClass = (value?: string | null) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "admin") return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
    if (normalized === "operator") return "bg-sky-50 text-sky-700 border-sky-100";
    return "bg-violet-50 text-violet-700 border-violet-100";
  };

  const getTypeBadgeClass = (value?: string | null) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "company") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (normalized === "personal") return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-zinc-50 text-zinc-600 border-zinc-200";
  };

  const startImpersonate = async (user: any) => {
    if (!user?.id || impersonatingId) return;

    setImpersonatingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/impersonate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Gagal masuk mode impersonate");
      }

      window.location.assign(data?.redirectTo || "/user/my-releases");
    } catch (error: any) {
      alert(error?.message || "Gagal masuk mode impersonate");
      setImpersonatingId(null);
    }
  };

  return (
    <main className="py-6 text-slate-800">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 mb-4">
          ← Menuju Dashboard
        </Link>
        <header className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-300">Data User</p>
            <h1 className="mt-2 text-3xl font-black">Client User dan Admin</h1>
          </div>
          <div className="flex rounded-md border border-slate-200 bg-slate-100 p-1">
            {[
              ["user", "Data User", Users],
              ["admin", "Data Admin", Shield],
            ].map(([id, label, Icon]: any) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-bold ${activeTab === id ? "bg-fuchsia-500 text-white" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Tipe User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Status Kontrak</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <span className="font-bold">{user.full_name || user.company_name || user.username || "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-black uppercase text-indigo-700">
                      {user.account_type || user.type || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-700">{user.email || "-"}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      Mendaftar: {formatDate(user.registered_at || user.joined_date || user.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getUserStatusClass(user.status)}`}>
                      {user.status || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getContractStatusClass(user.contract_status)}`}>
                      {getContractStatusLabel(user.contract_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {String(user.role || "").toLowerCase() === "user" && (
                        <button
                          type="button"
                          onClick={() => startImpersonate(user)}
                          disabled={impersonatingId === user.id}
                          title="Masuk sebagai user ini"
                          aria-label="Masuk sebagai user ini"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          <KeyRound size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="rounded-lg bg-indigo-650 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        style={{ background: '#7c3aed' }}
                      >
                        Lihat Data
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

      {/* Drawer Modal on Right */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slide-in-right {
              animation: slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}} />

          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedUser(null)}
          />
          
          <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slide-in-right">
              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                  <h3 className="text-lg font-black text-slate-900">Preview Data User</h3>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col items-center text-center space-y-3 py-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-500/10">
                    {selectedUser.full_name ? selectedUser.full_name.substring(0, 2).toUpperCase() : selectedUser.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">{selectedUser.full_name || selectedUser.company_name || selectedUser.username}</h4>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black uppercase ${getTypeBadgeClass(selectedUser.account_type || selectedUser.type)}`}>
                        {selectedUser.account_type || selectedUser.type || "-"}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getRoleBadgeClass(selectedUser.role)}`}>
                        {selectedUser.role || "-"}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getUserStatusClass(selectedUser.status)}`}>
                        {selectedUser.status || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Username</span>
                    <span className="font-semibold text-slate-700">{selectedUser.username}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                    <span className="font-semibold text-slate-700">{selectedUser.email}</span>
                  </div>
                </div>

                <UserContractStatus userId={selectedUser.id} compact />
              </div>

              {/* Footer Action */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
                <Link
                  href={`/admin/users/${selectedUser.id}`}
                  className="w-full text-center rounded-xl bg-indigo-650 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-sm"
                  style={{ background: '#7c3aed' }}
                >
                  Lihat data lengkap
                </Link>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full text-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
