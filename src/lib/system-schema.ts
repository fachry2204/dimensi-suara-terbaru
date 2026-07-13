import "server-only";

import { db, type RowDataPacket } from "@/lib/db";

type ColumnDefinition = {
  name: string;
  definition: string;
};

type TableDefinition = {
  name: string;
  createSql: string;
  columns: ColumnDefinition[];
};

export type SchemaIssue = {
  table: string;
  column?: string;
  reason: string;
};

export type SchemaInspection = {
  status: "OK" | "WARNING";
  missingTables: string[];
  missingColumns: SchemaIssue[];
};

export type SchemaRepairResult = {
  status: "FIXED" | "PARTIAL";
  before: SchemaInspection;
  after: SchemaInspection;
  ensuredTables: string[];
  addedColumns: SchemaIssue[];
  failedColumns: Array<SchemaIssue & { error: string }>;
};

function q(identifier: string) {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Identifier database tidak valid: ${identifier}`);
  }

  return `\`${identifier}\``;
}

const nullableText = (name: string, size = 255): ColumnDefinition => ({
  name,
  definition: `VARCHAR(${size}) NULL`,
});

const nullableLongText = (name: string): ColumnDefinition => ({
  name,
  definition: "LONGTEXT NULL",
});

const nullableInt = (name: string): ColumnDefinition => ({
  name,
  definition: "INT NULL",
});

const nullableBigInt = (name: string): ColumnDefinition => ({
  name,
  definition: "BIGINT UNSIGNED NULL",
});

const createdAt = { name: "created_at", definition: "DATETIME NULL DEFAULT CURRENT_TIMESTAMP" };
const updatedAt = { name: "updated_at", definition: "DATETIME NULL DEFAULT CURRENT_TIMESTAMP" };

const tableDefinitions: TableDefinition[] = [
  {
    name: "users",
    createSql: `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NULL,
        email VARCHAR(255) NULL,
        password_hash VARCHAR(255) NULL,
        password VARCHAR(255) NULL,
        role VARCHAR(50) NULL DEFAULT 'User',
        status VARCHAR(50) NULL DEFAULT 'Pending',
        type VARCHAR(50) NULL,
        account_type VARCHAR(50) NULL,
        company_name VARCHAR(255) NULL,
        full_name VARCHAR(255) NULL,
        phone VARCHAR(100) NULL,
        address TEXT NULL,
        country VARCHAR(100) NULL,
        province VARCHAR(100) NULL,
        city VARCHAR(100) NULL,
        district VARCHAR(100) NULL,
        subdistrict VARCHAR(100) NULL,
        postal_code VARCHAR(50) NULL,
        bank_name VARCHAR(150) NULL,
        bank_account_number VARCHAR(150) NULL,
        bank_account_holder VARCHAR(255) NULL,
        ktp_doc_path VARCHAR(500) NULL,
        npwp_doc_path VARCHAR(500) NULL,
        signature_doc_path VARCHAR(500) NULL,
        nib_doc_path VARCHAR(500) NULL,
        kemenkumham_doc_path VARCHAR(500) NULL,
        contract_doc_path VARCHAR(500) NULL,
        contract_status VARCHAR(50) NULL DEFAULT 'Pending',
        aggregator_percentage DECIMAL(8,4) NULL DEFAULT 70,
        publishing_percentage DECIMAL(8,4) NULL DEFAULT 70,
        registered_at DATETIME NULL,
        joined_date DATETIME NULL,
        rejected_date DATETIME NULL,
        rejection_reason TEXT NULL,
        block_reason TEXT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableText("username"),
      nullableText("email"),
      nullableText("password_hash"),
      nullableText("password"),
      { name: "role", definition: "VARCHAR(50) NULL DEFAULT 'User'" },
      { name: "status", definition: "VARCHAR(50) NULL DEFAULT 'Pending'" },
      nullableText("type", 50),
      nullableText("account_type", 50),
      nullableText("company_name"),
      nullableText("full_name"),
      nullableText("phone", 100),
      nullableLongText("address"),
      nullableText("country", 100),
      nullableText("province", 100),
      nullableText("city", 100),
      nullableText("district", 100),
      nullableText("subdistrict", 100),
      nullableText("postal_code", 50),
      nullableText("bank_name", 150),
      nullableText("bank_account_number", 150),
      nullableText("bank_account_holder"),
      nullableText("ktp_doc_path", 500),
      nullableText("npwp_doc_path", 500),
      nullableText("signature_doc_path", 500),
      nullableText("nib_doc_path", 500),
      nullableText("kemenkumham_doc_path", 500),
      nullableText("contract_doc_path", 500),
      { name: "contract_status", definition: "VARCHAR(50) NULL DEFAULT 'Pending'" },
      { name: "aggregator_percentage", definition: "DECIMAL(8,4) NULL DEFAULT 70" },
      { name: "publishing_percentage", definition: "DECIMAL(8,4) NULL DEFAULT 70" },
      { name: "registered_at", definition: "DATETIME NULL" },
      { name: "joined_date", definition: "DATETIME NULL" },
      { name: "rejected_date", definition: "DATETIME NULL" },
      nullableLongText("rejection_reason"),
      nullableLongText("block_reason"),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "releases",
    createSql: `
      CREATE TABLE IF NOT EXISTS releases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        title VARCHAR(500) NULL,
        version VARCHAR(150) NULL,
        type VARCHAR(50) NULL,
        release_type VARCHAR(50) NULL,
        cover_art VARCHAR(500) NULL,
        status VARCHAR(50) NULL DEFAULT 'Menunggu',
        submission_date DATETIME NULL,
        p_line VARCHAR(500) NULL,
        c_line VARCHAR(500) NULL,
        language VARCHAR(100) NULL,
        genre VARCHAR(150) NULL,
        sub_genre VARCHAR(150) NULL,
        primary_artists TEXT NULL,
        planned_release_date DATE NULL,
        original_release_date DATE NULL,
        pre_release_social_media VARCHAR(50) NULL,
        pre_release_youtube_music VARCHAR(50) NULL,
        genre_id INT NULL,
        subgenre_id INT NULL,
        upc VARCHAR(100) NULL,
        aggregator VARCHAR(100) NULL,
        rejection_reason TEXT NULL,
        rejection_description TEXT NULL,
        current_step INT NULL DEFAULT 1,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableInt("user_id"),
      nullableText("title", 500),
      nullableText("version", 150),
      nullableText("type", 50),
      nullableText("release_type", 50),
      nullableText("cover_art", 500),
      { name: "status", definition: "VARCHAR(50) NULL DEFAULT 'Menunggu'" },
      { name: "submission_date", definition: "DATETIME NULL" },
      nullableText("p_line", 500),
      nullableText("c_line", 500),
      nullableText("language", 100),
      nullableText("genre", 150),
      nullableText("sub_genre", 150),
      nullableLongText("primary_artists"),
      { name: "planned_release_date", definition: "DATE NULL" },
      { name: "original_release_date", definition: "DATE NULL" },
      nullableText("pre_release_social_media", 50),
      nullableText("pre_release_youtube_music", 50),
      nullableInt("genre_id"),
      nullableInt("subgenre_id"),
      nullableText("upc", 100),
      nullableText("aggregator", 100),
      nullableLongText("rejection_reason"),
      nullableLongText("rejection_description"),
      { name: "current_step", definition: "INT NULL DEFAULT 1" },
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "tracks",
    createSql: `
      CREATE TABLE IF NOT EXISTS tracks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        release_id INT NULL,
        title VARCHAR(500) NULL,
        audio_file VARCHAR(500) NULL,
        audio_clip VARCHAR(500) NULL,
        is_instrumental TINYINT(1) NULL DEFAULT 0,
        language VARCHAR(100) NULL,
        explicit_lyrics VARCHAR(50) NULL,
        lyrics LONGTEXT NULL,
        primary_artists TEXT NULL,
        featured_artists TEXT NULL,
        lyricist TEXT NULL,
        writer TEXT NULL,
        producer TEXT NULL,
        contributors TEXT NULL,
        track_number INT NULL,
        isrc VARCHAR(100) NULL,
        genre VARCHAR(150) NULL,
        sub_genre VARCHAR(150) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableInt("release_id"),
      nullableText("title", 500),
      nullableText("audio_file", 500),
      nullableText("audio_clip", 500),
      { name: "is_instrumental", definition: "TINYINT(1) NULL DEFAULT 0" },
      nullableText("language", 100),
      nullableText("explicit_lyrics", 50),
      nullableLongText("lyrics"),
      nullableLongText("primary_artists"),
      nullableLongText("featured_artists"),
      nullableLongText("lyricist"),
      nullableLongText("writer"),
      nullableLongText("producer"),
      nullableLongText("contributors"),
      nullableInt("track_number"),
      nullableText("isrc", 100),
      nullableText("genre", 150),
      nullableText("sub_genre", 150),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "settings",
    createSql: `
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(191) NULL,
        \`value\` LONGTEXT NULL,
        setting_key VARCHAR(191) NULL,
        setting_value LONGTEXT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableText("key", 191),
      nullableLongText("value"),
      nullableText("setting_key", 191),
      nullableLongText("setting_value"),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "login_settings",
    createSql: `
      CREATE TABLE IF NOT EXISTS login_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        logo VARCHAR(500) NULL,
        favicon_url VARCHAR(500) NULL,
        login_background VARCHAR(500) NULL,
        system_name VARCHAR(255) NULL,
        login_title VARCHAR(255) NULL,
        login_footer VARCHAR(255) NULL,
        login_button_color VARCHAR(50) NULL,
        login_form_bg_color VARCHAR(50) NULL,
        enable_registration TINYINT(1) NULL DEFAULT 1,
        login_title_color VARCHAR(50) NULL,
        login_footer_color VARCHAR(50) NULL,
        login_form_bg_opacity DECIMAL(5,2) NULL,
        login_bg_opacity DECIMAL(5,2) NULL,
        login_glass_effect TINYINT(1) NULL DEFAULT 0,
        login_form_text_color VARCHAR(50) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableText("logo", 500),
      nullableText("favicon_url", 500),
      nullableText("login_background", 500),
      nullableText("system_name"),
      nullableText("login_title"),
      nullableText("login_footer"),
      nullableText("login_button_color", 50),
      nullableText("login_form_bg_color", 50),
      { name: "enable_registration", definition: "TINYINT(1) NULL DEFAULT 1" },
      nullableText("login_title_color", 50),
      nullableText("login_footer_color", 50),
      { name: "login_form_bg_opacity", definition: "DECIMAL(5,2) NULL" },
      { name: "login_bg_opacity", definition: "DECIMAL(5,2) NULL" },
      { name: "login_glass_effect", definition: "TINYINT(1) NULL DEFAULT 0" },
      nullableText("login_form_text_color", 50),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "tickets",
    createSql: `
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        subject VARCHAR(255) NULL,
        title VARCHAR(255) NULL,
        category VARCHAR(100) NULL DEFAULT 'Lainnya',
        release_id INT NULL,
        release_title VARCHAR(500) NULL,
        upc VARCHAR(100) NULL,
        isrc VARCHAR(100) NULL,
        message TEXT NULL,
        file_path VARCHAR(500) NULL,
        status VARCHAR(30) NULL DEFAULT 'Open',
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableInt("user_id"),
      nullableText("subject"),
      nullableText("title"),
      { name: "category", definition: "VARCHAR(100) NULL DEFAULT 'Lainnya'" },
      nullableInt("release_id"),
      nullableText("release_title", 500),
      nullableText("upc", 100),
      nullableText("isrc", 100),
      nullableLongText("message"),
      nullableText("file_path", 500),
      { name: "status", definition: "VARCHAR(30) NULL DEFAULT 'Open'" },
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "ticket_replies",
    createSql: `
      CREATE TABLE IF NOT EXISTS ticket_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NULL,
        sender_id INT NULL,
        message TEXT NULL,
        file_path VARCHAR(500) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableInt("ticket_id"),
      nullableInt("sender_id"),
      nullableLongText("message"),
      nullableText("file_path", 500),
      createdAt,
    ],
  },
  {
    name: "announcements",
    createSql: `
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NULL,
        body TEXT NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        created_by INT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableText("title"),
      nullableLongText("body"),
      { name: "start_date", definition: "DATE NULL" },
      { name: "end_date", definition: "DATE NULL" },
      nullableInt("created_by"),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "contract_templates",
    createSql: `
      CREATE TABLE IF NOT EXISTS contract_templates (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NULL,
        file_path VARCHAR(500) NULL,
        mime_type VARCHAR(100) NULL,
        file_size BIGINT UNSIGNED NULL,
        checksum_sha256 VARCHAR(64) NULL,
        account_type VARCHAR(20) NULL DEFAULT 'PERSONAL',
        version INT UNSIGNED NULL DEFAULT 1,
        is_active TINYINT(1) NULL DEFAULT 1,
        uploaded_by BIGINT UNSIGNED NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableText("file_name"),
      nullableText("file_path", 500),
      nullableText("mime_type", 100),
      nullableBigInt("file_size"),
      nullableText("checksum_sha256", 64),
      { name: "account_type", definition: "VARCHAR(20) NULL DEFAULT 'PERSONAL'" },
      { name: "version", definition: "INT UNSIGNED NULL DEFAULT 1" },
      { name: "is_active", definition: "TINYINT(1) NULL DEFAULT 1" },
      nullableBigInt("uploaded_by"),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "user_contracts",
    createSql: `
      CREATE TABLE IF NOT EXISTS user_contracts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        contract_template_id BIGINT UNSIGNED NULL,
        version INT UNSIGNED NULL DEFAULT 1,
        status VARCHAR(30) NULL DEFAULT 'GENERATING',
        file_name VARCHAR(255) NULL,
        file_path VARCHAR(500) NULL,
        mime_type VARCHAR(100) NULL,
        file_size BIGINT UNSIGNED NULL,
        checksum_sha256 VARCHAR(64) NULL,
        generated_data_snapshot JSON NULL,
        error_message TEXT NULL,
        generated_by BIGINT UNSIGNED NULL,
        generated_at DATETIME NULL,
        is_current TINYINT(1) NULL DEFAULT 1,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableBigInt("user_id"),
      nullableBigInt("contract_template_id"),
      { name: "version", definition: "INT UNSIGNED NULL DEFAULT 1" },
      { name: "status", definition: "VARCHAR(30) NULL DEFAULT 'GENERATING'" },
      nullableText("file_name"),
      nullableText("file_path", 500),
      nullableText("mime_type", 100),
      nullableBigInt("file_size"),
      nullableText("checksum_sha256", 64),
      { name: "generated_data_snapshot", definition: "JSON NULL" },
      nullableLongText("error_message"),
      nullableBigInt("generated_by"),
      { name: "generated_at", definition: "DATETIME NULL" },
      { name: "is_current", definition: "TINYINT(1) NULL DEFAULT 1" },
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "report_batches",
    createSql: `
      CREATE TABLE IF NOT EXISTS report_batches (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        aggregator_name VARCHAR(150) NULL,
        report_period DATE NULL,
        original_file_name VARCHAR(255) NULL,
        stored_file_path VARCHAR(500) NULL,
        file_mime_type VARCHAR(150) NULL,
        file_size BIGINT UNSIGNED NULL,
        file_sha256 CHAR(64) NULL,
        sheet_name VARCHAR(255) NULL,
        status VARCHAR(40) NULL DEFAULT 'UPLOADING',
        total_rows INT UNSIGNED NULL DEFAULT 0,
        matched_rows INT UNSIGNED NULL DEFAULT 0,
        no_account_rows INT UNSIGNED NULL DEFAULT 0,
        conflict_rows INT UNSIGNED NULL DEFAULT 0,
        invalid_rows INT UNSIGNED NULL DEFAULT 0,
        gross_revenue_summary JSON NULL,
        gross_idr_total DECIMAL(24,0) NULL DEFAULT 0,
        user_revenue_total DECIMAL(24,0) NULL DEFAULT 0,
        aggregator_revenue_total DECIMAL(24,0) NULL DEFAULT 0,
        currency_rates_snapshot JSON NULL,
        uploaded_by BIGINT UNSIGNED NULL,
        finalized_by BIGINT UNSIGNED NULL,
        uploaded_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        finalized_at DATETIME NULL,
        error_message TEXT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableText("aggregator_name", 150),
      { name: "report_period", definition: "DATE NULL" },
      nullableText("original_file_name"),
      nullableText("stored_file_path", 500),
      nullableText("file_mime_type", 150),
      nullableBigInt("file_size"),
      { name: "file_sha256", definition: "CHAR(64) NULL" },
      nullableText("sheet_name"),
      { name: "status", definition: "VARCHAR(40) NULL DEFAULT 'UPLOADING'" },
      { name: "total_rows", definition: "INT UNSIGNED NULL DEFAULT 0" },
      { name: "matched_rows", definition: "INT UNSIGNED NULL DEFAULT 0" },
      { name: "no_account_rows", definition: "INT UNSIGNED NULL DEFAULT 0" },
      { name: "conflict_rows", definition: "INT UNSIGNED NULL DEFAULT 0" },
      { name: "invalid_rows", definition: "INT UNSIGNED NULL DEFAULT 0" },
      { name: "gross_revenue_summary", definition: "JSON NULL" },
      { name: "gross_idr_total", definition: "DECIMAL(24,0) NULL DEFAULT 0" },
      { name: "user_revenue_total", definition: "DECIMAL(24,0) NULL DEFAULT 0" },
      { name: "aggregator_revenue_total", definition: "DECIMAL(24,0) NULL DEFAULT 0" },
      { name: "currency_rates_snapshot", definition: "JSON NULL" },
      nullableBigInt("uploaded_by"),
      nullableBigInt("finalized_by"),
      { name: "uploaded_at", definition: "DATETIME NULL DEFAULT CURRENT_TIMESTAMP" },
      { name: "finalized_at", definition: "DATETIME NULL" },
      nullableLongText("error_message"),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "report_rows",
    createSql: `
      CREATE TABLE IF NOT EXISTS report_rows (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        report_batch_id BIGINT UNSIGNED NULL,
        row_number INT UNSIGNED NULL,
        artist_name VARCHAR(255) NULL,
        release_title VARCHAR(500) NULL,
        track_title VARCHAR(500) NULL,
        upc_original VARCHAR(100) NULL,
        upc_normalized VARCHAR(100) NULL,
        isrc_original VARCHAR(100) NULL,
        isrc_normalized VARCHAR(100) NULL,
        platform VARCHAR(150) NULL,
        country_region VARCHAR(150) NULL,
        quantity DECIMAL(24,8) NULL,
        client_payment_currency VARCHAR(10) NULL,
        net_revenue DECIMAL(24,8) NULL,
        exchange_rate DECIMAL(24,8) NULL,
        gross_idr_final DECIMAL(24,0) NULL,
        matched_user_id BIGINT UNSIGNED NULL,
        matched_release_id BIGINT UNSIGNED NULL,
        matched_track_id BIGINT UNSIGNED NULL,
        match_method VARCHAR(30) NULL,
        assignment_method VARCHAR(30) NULL,
        user_percentage DECIMAL(8,4) NULL,
        aggregator_percentage DECIMAL(8,4) NULL,
        user_revenue DECIMAL(24,0) NULL,
        aggregator_revenue DECIMAL(24,0) NULL,
        status VARCHAR(30) NULL,
        warning_message TEXT NULL,
        error_message TEXT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableBigInt("report_batch_id"),
      { name: "row_number", definition: "INT UNSIGNED NULL" },
      nullableText("reporting_month", 100),
      nullableText("sales_month", 100),
      nullableText("platform", 150),
      nullableText("country_region", 150),
      nullableText("label_name"),
      nullableText("artist_name"),
      nullableText("release_title", 500),
      nullableText("track_title", 500),
      nullableText("upc_original", 100),
      nullableText("upc_normalized", 100),
      nullableText("isrc_original", 100),
      nullableText("isrc_normalized", 100),
      nullableText("streaming_subscription_type"),
      nullableText("release_type", 150),
      nullableText("sales_type", 150),
      { name: "quantity", definition: "DECIMAL(24,8) NULL" },
      nullableText("client_payment_currency", 10),
      { name: "net_revenue", definition: "DECIMAL(24,8) NULL" },
      { name: "exchange_rate", definition: "DECIMAL(24,8) NULL" },
      { name: "gross_idr_decimal", definition: "DECIMAL(24,8) NULL" },
      { name: "gross_idr_final", definition: "DECIMAL(24,0) NULL" },
      nullableBigInt("matched_user_id"),
      nullableBigInt("matched_release_id"),
      nullableBigInt("matched_track_id"),
      nullableText("match_method", 30),
      nullableText("assignment_method", 30),
      { name: "user_percentage", definition: "DECIMAL(8,4) NULL" },
      { name: "aggregator_percentage", definition: "DECIMAL(8,4) NULL" },
      { name: "user_revenue", definition: "DECIMAL(24,0) NULL" },
      { name: "aggregator_revenue", definition: "DECIMAL(24,0) NULL" },
      nullableText("status", 30),
      nullableLongText("warning_message"),
      nullableLongText("error_message"),
      nullableBigInt("manually_assigned_by"),
      { name: "manually_assigned_at", definition: "DATETIME NULL" },
      nullableLongText("manual_assignment_note"),
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "user_revenue_ledger",
    createSql: `
      CREATE TABLE IF NOT EXISTS user_revenue_ledger (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        report_batch_id BIGINT UNSIGNED NULL,
        report_row_id BIGINT UNSIGNED NULL,
        ledger_type VARCHAR(30) NULL DEFAULT 'ROYALTY',
        sales_month VARCHAR(100) NULL,
        platform VARCHAR(150) NULL,
        country_region VARCHAR(150) NULL,
        artist_name VARCHAR(255) NULL,
        release_title VARCHAR(500) NULL,
        track_title VARCHAR(500) NULL,
        upc VARCHAR(100) NULL,
        isrc VARCHAR(100) NULL,
        quantity DECIMAL(24,8) NULL,
        original_currency VARCHAR(10) NULL,
        original_net_revenue DECIMAL(24,8) NULL,
        exchange_rate_snapshot DECIMAL(24,8) NULL,
        gross_idr_snapshot DECIMAL(24,0) NULL,
        user_percentage_snapshot DECIMAL(8,4) NULL,
        aggregator_percentage_snapshot DECIMAL(8,4) NULL,
        user_revenue_idr DECIMAL(24,0) NULL,
        aggregator_revenue_idr DECIMAL(24,0) NULL,
        status VARCHAR(30) NULL DEFAULT 'FINALIZED',
        finalized_at DATETIME NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableBigInt("user_id"),
      nullableBigInt("report_batch_id"),
      nullableBigInt("report_row_id"),
      { name: "ledger_type", definition: "VARCHAR(30) NULL DEFAULT 'ROYALTY'" },
      nullableText("sales_month", 100),
      nullableText("platform", 150),
      nullableText("country_region", 150),
      nullableText("artist_name"),
      nullableText("release_title", 500),
      nullableText("track_title", 500),
      nullableText("upc", 100),
      nullableText("isrc", 100),
      { name: "quantity", definition: "DECIMAL(24,8) NULL" },
      nullableText("original_currency", 10),
      { name: "original_net_revenue", definition: "DECIMAL(24,8) NULL" },
      { name: "exchange_rate_snapshot", definition: "DECIMAL(24,8) NULL" },
      { name: "gross_idr_snapshot", definition: "DECIMAL(24,0) NULL" },
      { name: "user_percentage_snapshot", definition: "DECIMAL(8,4) NULL" },
      { name: "aggregator_percentage_snapshot", definition: "DECIMAL(8,4) NULL" },
      { name: "user_revenue_idr", definition: "DECIMAL(24,0) NULL" },
      { name: "aggregator_revenue_idr", definition: "DECIMAL(24,0) NULL" },
      { name: "status", definition: "VARCHAR(30) NULL DEFAULT 'FINALIZED'" },
      { name: "finalized_at", definition: "DATETIME NULL" },
      createdAt,
    ],
  },
  {
    name: "songs",
    createSql: `
      CREATE TABLE IF NOT EXISTS songs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        title VARCHAR(500) NULL,
        status VARCHAR(50) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [nullableInt("user_id"), nullableText("title", 500), nullableText("status", 50), createdAt, updatedAt],
  },
  {
    name: "writers",
    createSql: `
      CREATE TABLE IF NOT EXISTS writers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        name VARCHAR(255) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [nullableInt("user_id"), nullableText("name"), createdAt, updatedAt],
  },
  {
    name: "song_writers",
    createSql: `
      CREATE TABLE IF NOT EXISTS song_writers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        song_id INT NULL,
        writer_id INT NULL,
        role VARCHAR(100) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [nullableInt("song_id"), nullableInt("writer_id"), nullableText("role", 100), createdAt],
  },
  {
    name: "genres",
    createSql: `
      CREATE TABLE IF NOT EXISTS genres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [nullableText("name"), createdAt],
  },
  {
    name: "subgenres",
    createSql: `
      CREATE TABLE IF NOT EXISTS subgenres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        genre_id INT NULL,
        name VARCHAR(255) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [nullableInt("genre_id"), nullableText("name"), createdAt],
  },
  {
    name: "notifications",
    createSql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        is_read TINYINT(1) NULL DEFAULT 0,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [nullableInt("user_id"), nullableText("title"), nullableLongText("message"), { name: "is_read", definition: "TINYINT(1) NULL DEFAULT 0" }, createdAt],
  },
  {
    name: "system_logs",
    createSql: `
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        check_type VARCHAR(100) NULL,
        status VARCHAR(50) NULL,
        details TEXT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [nullableText("check_type", 100), nullableText("status", 50), nullableLongText("details"), createdAt],
  },
  {
    name: "security_logs",
    createSql: `
      CREATE TABLE IF NOT EXISTS security_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_identifier VARCHAR(255) NULL,
        ip_address VARCHAR(100) NULL,
        country VARCHAR(100) NULL,
        attack_type VARCHAR(100) NULL,
        details TEXT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    columns: [
      nullableText("user_identifier"),
      nullableText("ip_address", 100),
      nullableText("country", 100),
      nullableText("attack_type", 100),
      nullableLongText("details"),
      createdAt,
    ],
  },
];

async function getExistingTables() {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
  );

  return new Set(rows.map((row) => String(row.TABLE_NAME || row.table_name)));
}

async function getExistingColumns(table: string) {
  const [rows] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM ${q(table)}`);
  return new Set(rows.map((row) => String(row.Field)));
}

export async function inspectSystemSchema(): Promise<SchemaInspection> {
  const existingTables = await getExistingTables();
  const missingTables: string[] = [];
  const missingColumns: SchemaIssue[] = [];

  for (const table of tableDefinitions) {
    if (!existingTables.has(table.name)) {
      missingTables.push(table.name);
      continue;
    }

    const existingColumns = await getExistingColumns(table.name);
    for (const column of table.columns) {
      if (!existingColumns.has(column.name)) {
        missingColumns.push({
          table: table.name,
          column: column.name,
          reason: "Kolom belum ada",
        });
      }
    }
  }

  return {
    status: missingTables.length || missingColumns.length ? "WARNING" : "OK",
    missingTables,
    missingColumns,
  };
}

export async function ensureSystemSchema(): Promise<SchemaRepairResult> {
  const before = await inspectSystemSchema();
  const ensuredTables: string[] = [];
  const addedColumns: SchemaIssue[] = [];
  const failedColumns: Array<SchemaIssue & { error: string }> = [];

  for (const table of tableDefinitions) {
    await db.query(table.createSql);
    ensuredTables.push(table.name);

    const existingColumns = await getExistingColumns(table.name);
    for (const column of table.columns) {
      if (existingColumns.has(column.name)) continue;

      try {
        await db.query(`ALTER TABLE ${q(table.name)} ADD COLUMN ${q(column.name)} ${column.definition}`);
        addedColumns.push({
          table: table.name,
          column: column.name,
          reason: "Kolom ditambahkan",
        });
      } catch (error: any) {
        failedColumns.push({
          table: table.name,
          column: column.name,
          reason: "Kolom gagal ditambahkan",
          error: error?.message || String(error),
        });
      }
    }
  }

  const after = await inspectSystemSchema();

  return {
    status: failedColumns.length || after.status !== "OK" ? "PARTIAL" : "FIXED",
    before,
    after,
    ensuredTables,
    addedColumns,
    failedColumns,
  };
}
