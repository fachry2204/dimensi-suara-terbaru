"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

type UserForm = {
  username: string;
  email: string;
  account_type: string;
  company_name: string;
  full_name: string;
  nik: string;
  phone: string;
  address: string;
  country: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  pic_name: string;
  pic_position: string;
  pic_phone: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  ktp_doc_path: string;
  npwp_doc_path: string;
  signature_doc_path: string;
  nib_doc_path: string;
  kemenkumham_doc_path: string;
  contract_doc_path: string;
};

const EMPTY_FORM: UserForm = {
  username: "",
  email: "",
  account_type: "PERSONAL",
  company_name: "",
  full_name: "",
  nik: "",
  phone: "",
  address: "",
  country: "",
  province: "",
  city: "",
  district: "",
  subdistrict: "",
  postal_code: "",
  pic_name: "",
  pic_position: "",
  pic_phone: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
  ktp_doc_path: "",
  npwp_doc_path: "",
  signature_doc_path: "",
  nib_doc_path: "",
  kemenkumham_doc_path: "",
  contract_doc_path: "",
};

const SECTIONS: Array<{ title: string; fields: Array<{ name: keyof UserForm; label: string; type?: string; span?: "full" }> }> = [
  {
    title: "Akun",
    fields: [
      { name: "username", label: "Username" },
      { name: "email", label: "Email", type: "email" },
      { name: "account_type", label: "Tipe Akun" },
      { name: "company_name", label: "Nama Perusahaan" },
      { name: "full_name", label: "Nama Lengkap" },
      { name: "nik", label: "NIK" },
      { name: "phone", label: "Phone" },
    ],
  },
  {
    title: "Alamat",
    fields: [
      { name: "address", label: "Address", span: "full" },
      { name: "country", label: "Country" },
      { name: "province", label: "Province" },
      { name: "city", label: "City" },
      { name: "district", label: "District" },
      { name: "subdistrict", label: "Subdistrict" },
      { name: "postal_code", label: "Postal Code" },
    ],
  },
  {
    title: "PIC",
    fields: [
      { name: "pic_name", label: "Nama PIC" },
      { name: "pic_position", label: "Jabatan PIC" },
      { name: "pic_phone", label: "Phone PIC" },
    ],
  },
  {
    title: "Data Bank",
    fields: [
      { name: "bank_name", label: "Nama Bank" },
      { name: "bank_account_number", label: "Nomor Rekening" },
      { name: "bank_account_name", label: "Atas Nama Rekening" },
    ],
  },
  {
    title: "Path Dokumen",
    fields: [
      { name: "ktp_doc_path", label: "KTP", span: "full" },
      { name: "npwp_doc_path", label: "NPWP", span: "full" },
      { name: "signature_doc_path", label: "Tanda Tangan", span: "full" },
      { name: "nib_doc_path", label: "NIB", span: "full" },
      { name: "kemenkumham_doc_path", label: "Kemenkumham", span: "full" },
      { name: "contract_doc_path", label: "Kontrak", span: "full" },
    ],
  },
];

export default function AdminEditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/users/${id}`, { credentials: "include" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || "Gagal mengambil data user");
        return body;
      })
      .then((user) => {
        const next = { ...EMPTY_FORM };
        (Object.keys(next) as Array<keyof UserForm>).forEach((key) => {
          next[key] = user[key] == null ? "" : String(user[key]);
        });
        setForm(next);
      })
      .catch((err) => setError(err.message || "Gagal mengambil data user"))
      .finally(() => setIsLoading(false));
  }, [id]);

  const displayName = useMemo(() => form.full_name || form.company_name || form.username || "User", [form]);

  function updateField(name: keyof UserForm, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Gagal menyimpan data user");
      setSuccess("Data user berhasil disimpan.");
      setTimeout(() => router.push(`/admin/users/${id}`), 700);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data user");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="py-6 text-slate-800">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800">
          <ArrowLeft size={16} /> Kembali ke Detail User
        </Link>
        <Link href="/admin/users" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
          Daftar User
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-400">Edit Data User</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{displayName}</h1>
        <p className="mt-1 text-sm text-slate-500">Perubahan hanya dilakukan oleh role admin dan tersimpan ke data user.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-extrabold text-slate-800">{section.title}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field.name} className={field.span === "full" ? "md:col-span-2" : ""}>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{field.label}</span>
                  {field.name === "account_type" ? (
                    <select
                      value={form.account_type}
                      onChange={(event) => updateField("account_type", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="PERSONAL">PERSONAL</option>
                      <option value="COMPANY">COMPANY</option>
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      value={form[field.name]}
                      onChange={(event) => updateField(field.name, event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}

        {(error || success) && (
          <div className={`rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error || success}
          </div>
        )}

        <div className="sticky bottom-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan Data User"}
          </button>
        </div>
      </form>
    </main>
  );
}
