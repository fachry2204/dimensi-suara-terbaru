"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Eye, FileText, Loader2, Save, Upload, X } from "lucide-react";

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

const TEXT_SECTIONS: Array<{ title: string; fields: Array<{ name: keyof UserForm; label: string; type?: string; span?: "full" }> }> = [
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
];

const DOC_FIELDS: Array<{ name: keyof UserForm; label: string }> = [
  { name: "ktp_doc_path", label: "KTP" },
  { name: "npwp_doc_path", label: "NPWP" },
  { name: "signature_doc_path", label: "Tanda Tangan" },
  { name: "nib_doc_path", label: "NIB" },
  { name: "kemenkumham_doc_path", label: "Kemenkumham" },
  { name: "contract_doc_path", label: "Kontrak" },
];

function getDocUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export default function AdminEditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  async function handleFileUpload(docType: keyof UserForm, file: File) {
    setUploadingDoc(docType);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);

      const res = await fetch(`/api/users/${id}/upload-document`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Gagal mengupload dokumen");

      updateField(docType, body.path);
      setSuccess(body.message || `File ${docType} berhasil diupload & menimpa file lama.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Gagal mengupload dokumen");
    } finally {
      setUploadingDoc(null);
    }
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
        {TEXT_SECTIONS.map((section) => (
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

        {/* Dokumen User Section with Previews, Download Buttons, and Upload Replacement */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-extrabold text-slate-800">Dokumen User</h2>
          <p className="mb-4 text-xs font-medium text-slate-500">
            Preview file dokumen user, tombol download, dan tombol upload untuk menimpa/mengganti file lama secara otomatis.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {DOC_FIELDS.map((doc) => {
              const pathVal = form[doc.name];
              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(pathVal);
              const docUrl = getDocUrl(pathVal);
              const isUploadingThis = uploadingDoc === doc.name;

              return (
                <div key={doc.name} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">{doc.label}</span>
                      {pathVal ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Tersedia
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">
                          Kosong
                        </span>
                      )}
                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRefs.current[doc.name] = el;
                      }}
                      className="hidden"
                      accept={doc.name === "contract_doc_path" ? ".pdf,.doc,.docx,.jpg,.jpeg,.png" : "image/*,.pdf"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(doc.name, file);
                        }
                        e.target.value = "";
                      }}
                    />

                    {/* Preview Box */}
                    <div className="relative mb-3 flex min-h-[140px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                      {isUploadingThis ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-indigo-600">
                          <Loader2 size={28} className="animate-spin" />
                          <span className="text-xs font-bold">Mengupload & menimpa file...</span>
                        </div>
                      ) : pathVal ? (
                        isImage ? (
                          <img
                            src={docUrl}
                            alt={doc.label}
                            className="max-h-40 w-full object-contain rounded-md"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500">
                            <FileText size={36} className="mb-1 text-indigo-500" />
                            <p className="max-w-[220px] truncate text-xs font-bold text-slate-800">
                              {pathVal.split("/").pop()}
                            </p>
                            <span className="mt-1 text-[10px] font-semibold text-slate-400">Dokumen File</span>
                          </div>
                        )
                      ) : (
                        <div className="text-center text-xs font-semibold text-slate-400">
                          Belum ada dokumen {doc.label}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {/* Action Buttons */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {pathVal && isImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(docUrl)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-indigo-600 shadow-sm"
                        >
                          <Eye size={14} /> Pratinjau
                        </button>
                      )}

                      {pathVal && (
                        <a
                          href={docUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                        >
                          <Download size={14} /> Download File
                        </a>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingThis}
                        onClick={() => fileInputRefs.current[doc.name]?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
                      >
                        {isUploadingThis ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {pathVal ? "Upload & Timpa File" : "Upload File"}
                      </button>
                    </div>

                    {/* Path Input */}
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Path File (Lokasi)
                      </label>
                      <input
                        type="text"
                        value={pathVal}
                        onChange={(e) => updateField(doc.name, e.target.value)}
                        placeholder={`/uploads/profiles/file-${doc.name}.jpg`}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

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

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-4">
            <button
              type="button"
              onClick={() => setPreviewDoc(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow text-slate-600 hover:text-red-600 transition"
            >
              <X size={16} />
            </button>
            {/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(previewDoc) ? (
              <img
                src={previewDoc}
                alt="Preview Dokumen"
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-12 text-slate-500">
                <FileText size={48} className="text-slate-400" />
                <p className="text-sm font-semibold text-center">Preview langsung tidak tersedia untuk format file ini.<br />Silakan unduh untuk melihat dokumen.</p>
                <a
                  href={previewDoc}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
                >
                  <Download size={16} /> Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
