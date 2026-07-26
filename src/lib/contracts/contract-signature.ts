import crypto from "crypto";

import PizZip from "pizzip";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function paragraph(text: string, options: { bold?: boolean; size?: number; color?: string } = {}) {
  const size = options.size || 22;
  const properties = [
    options.bold ? "<w:b/>" : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`,
  ].join("");

  return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function extractContractPreview(buffer: Buffer) {
  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")?.asText() || "";
  const paragraphs = Array.from(xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g))
    .map(([block]) => {
      const text = Array.from(block.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g))
        .map((match) => decodeXml(match[1]))
        .join("");
      return text.trim();
    })
    .filter(Boolean);

  return paragraphs.join("\n").slice(0, 50_000);
}

export function createSignedContractDocx(input: {
  originalBuffer: Buffer;
  signatureBuffer: Buffer;
  requestId: number;
  signerName: string;
  signerEmail: string;
  signedAtLabel: string;
  signerIp: string;
  contractChecksum: string;
}) {
  const zip = new PizZip(input.originalBuffer);
  const documentFile = zip.file("word/document.xml");
  const relationshipsFile = zip.file("word/_rels/document.xml.rels");
  const contentTypesFile = zip.file("[Content_Types].xml");

  if (!documentFile || !relationshipsFile || !contentTypesFile) {
    throw new Error("Struktur file DOCX kontrak tidak valid");
  }

  let documentXml = documentFile.asText();
  let relationshipsXml = relationshipsFile.asText();
  let contentTypesXml = contentTypesFile.asText();

  const relationshipIds = Array.from(relationshipsXml.matchAll(/Id="rId(\d+)"/g)).map((match) => Number(match[1]));
  const relationshipId = `rId${Math.max(0, ...relationshipIds) + 1}`;
  const imageName = `contract-signature-${input.requestId}.png`;

  zip.file(`word/media/${imageName}`, input.signatureBuffer);
  relationshipsXml = relationshipsXml.replace(
    "</Relationships>",
    `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/></Relationships>`
  );

  if (!/Extension="png"/i.test(contentTypesXml)) {
    contentTypesXml = contentTypesXml.replace(
      "</Types>",
      '<Default Extension="png" ContentType="image/png"/></Types>'
    );
  }

  const signatureDrawing = `
    <w:p>
      <w:pPr><w:spacing w:before="100" w:after="120"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="2600000" cy="1100000"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="${10000 + input.requestId}" name="Tanda tangan ${escapeXml(input.signerName)}"/>
            <wp:cNvGraphicFramePr/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="0" name="${imageName}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relationshipId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="2600000" cy="1100000"/></a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>`;

  const auditPage = [
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    paragraph("LEMBAR TANDA TANGAN DIGITAL", { bold: true, size: 30, color: "25155B" }),
    paragraph("Dokumen ini merupakan bagian yang tidak terpisahkan dari kontrak.", { size: 20, color: "64748B" }),
    paragraph("Ditandatangani oleh", { bold: true, size: 20 }),
    paragraph(input.signerName, { bold: true, size: 28 }),
    signatureDrawing,
    paragraph(`Email: ${input.signerEmail || "-"}`, { size: 20 }),
    paragraph(`Waktu penandatanganan: ${input.signedAtLabel}`, { size: 20 }),
    paragraph(`Alamat IP: ${input.signerIp || "-"}`, { size: 20 }),
    paragraph(`ID permintaan: DS-SIGN-${input.requestId}`, { size: 20 }),
    paragraph(`SHA-256 dokumen asli: ${input.contractChecksum || "-"}`, { size: 16, color: "64748B" }),
    paragraph("Tanda tangan dibubuhkan melalui halaman penandatanganan digital Dimensi Suara setelah penanda tangan menyatakan telah membaca dan menyetujui isi kontrak.", { size: 18, color: "475569" }),
  ].join("");

  const sectionIndex = documentXml.lastIndexOf("<w:sectPr");
  if (sectionIndex >= 0) {
    documentXml = `${documentXml.slice(0, sectionIndex)}${auditPage}${documentXml.slice(sectionIndex)}`;
  } else {
    documentXml = documentXml.replace("</w:body>", `${auditPage}</w:body>`);
  }

  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", relationshipsXml);
  zip.file("[Content_Types].xml", contentTypesXml);

  const buffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
  return {
    buffer,
    checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}
