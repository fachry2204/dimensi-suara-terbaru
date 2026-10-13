# Contract template analysis

## Structural skeleton

- Uploaded DOCX remains the canonical source; the generator changes placeholder text only.
- Body paragraphs contain the agreement clauses, revenue-sharing provisions, payment terms, and signature/party identity section.
- Repeated headers, footers, spacing, and page breaks are inherited from the uploaded template.

## Semantic roles and styles

- Contract title and party headings use the template's existing heading styles.
- Body clauses retain the template's paragraph, indentation, font, and line-spacing definitions.
- Dynamic user identity, address, percentage, bank, contact, date, and contract-number fields inherit the formatting of the first placeholder run.

## Layout and fidelity rules

- No content is rebuilt as HTML or plain text.
- DOCX OOXML is copied intact; only text inside recognized `<placeholder>` ranges is replaced.
- Placeholders split across multiple Word runs are supported without flattening the surrounding paragraph.
- Unknown placeholders stop generation so incomplete contracts are not issued.

## Reusable generation rules

- Active template is selected by account type and highest active version.
- Generated files are versioned per user and protected outside the public directory.
- SHA-256, file size, template version, generator, and data snapshot are recorded.
- Digital signatures are stored as separate evidence with signer identity, timestamp, IP, user agent, and contract checksum because the current template has no signature-image placeholder.
