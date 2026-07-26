import type { Metadata } from "next";

import { ContractSigningPage } from "@/components/contracts/ContractSigningPage";

export const metadata: Metadata = {
  title: "Tandatangani Kontrak",
  description: "Tinjau dan tandatangani kontrak Dimensi Suara secara digital.",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ContractSigningPage token={token} />;
}
