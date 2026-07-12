ALTER TABLE contract_templates
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL' AFTER checksum_sha256;

CREATE INDEX IF NOT EXISTS idx_contract_template_account_type
  ON contract_templates (account_type, is_active);
