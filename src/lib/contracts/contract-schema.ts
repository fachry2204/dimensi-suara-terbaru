import { db } from "@/lib/db";

let initialized = false;

export async function ensureContractTables() {
  if (initialized) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100) NULL,
      file_size BIGINT UNSIGNED NULL,
      checksum_sha256 VARCHAR(64) NULL,
      account_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',
      version INT UNSIGNED NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      uploaded_by BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_contract_template_active (is_active),
      INDEX idx_contract_template_account_type (account_type, is_active)
    )
  `);

  const [templateColumns]: any = await db.query("SHOW COLUMNS FROM contract_templates");
  const templateColumnNames = Array.isArray(templateColumns) ? templateColumns.map((column: any) => column.Field) : [];
  if (!templateColumnNames.includes("account_type")) {
    await db.query("ALTER TABLE contract_templates ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL' AFTER checksum_sha256");
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_contracts (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      contract_template_id BIGINT UNSIGNED NULL,
      version INT UNSIGNED NOT NULL DEFAULT 1,
      status VARCHAR(30) NOT NULL DEFAULT 'GENERATING',
      file_name VARCHAR(255) NULL,
      file_path VARCHAR(500) NULL,
      mime_type VARCHAR(100) NULL,
      file_size BIGINT UNSIGNED NULL,
      checksum_sha256 VARCHAR(64) NULL,
      generated_data_snapshot JSON NULL,
      error_message TEXT NULL,
      generated_by BIGINT UNSIGNED NULL,
      generated_at DATETIME NULL,
      is_current TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_contract (user_id, is_current),
      INDEX idx_contract_status (status),
      INDEX idx_generated_at (generated_at)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS contract_signing_requests (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      contract_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SIGNATURE',
      sent_by BIGINT UNSIGNED NULL,
      sent_at DATETIME NULL,
      expires_at DATETIME NOT NULL,
      signed_at DATETIME NULL,
      signer_name VARCHAR(255) NULL,
      signer_email VARCHAR(255) NULL,
      signer_ip VARCHAR(100) NULL,
      signer_user_agent TEXT NULL,
      signature_file_path VARCHAR(500) NULL,
      signed_file_name VARCHAR(255) NULL,
      signed_file_path VARCHAR(500) NULL,
      signed_mime_type VARCHAR(100) NULL,
      signed_file_size BIGINT UNSIGNED NULL,
      signed_checksum_sha256 CHAR(64) NULL,
      email_status VARCHAR(30) NULL,
      email_error TEXT NULL,
      whatsapp_status VARCHAR(30) NULL,
      whatsapp_error TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_contract_signing_token (token_hash),
      INDEX idx_contract_signing_contract (contract_id, created_at),
      INDEX idx_contract_signing_user (user_id, created_at),
      INDEX idx_contract_signing_status (status, expires_at)
    )
  `);

  initialized = true;
}
