use std::path::Path;

use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

pub type DbPool = SqlitePool;

const INIT_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    model_id   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conv
    ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS model_configs (
    id       TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('openai','anthropic','gemini')),
    name     TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT '',
    api_key  TEXT NOT NULL DEFAULT '',
    model    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS global_settings (
    id                 INTEGER PRIMARY KEY CHECK (id = 1),
    api_key            TEXT NOT NULL DEFAULT '',
    base_url_openai    TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
    base_url_anthropic TEXT NOT NULL DEFAULT 'https://api.anthropic.com',
    base_url_gemini    TEXT NOT NULL DEFAULT 'https://generativelanguage.googleapis.com'
);

INSERT OR IGNORE INTO global_settings (id) VALUES (1);
"#;

pub async fn init(db_path: &Path) -> Result<DbPool, sqlx::Error> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let url = format!("sqlite://{}?mode=rwc", db_path.display());
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await?;

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await?;

    // Split and run each CREATE separately so a single failure points to the
    // right statement.
    for stmt in INIT_SQL.split(';').map(str::trim).filter(|s| !s.is_empty()) {
        sqlx::query(stmt).execute(&pool).await?;
    }

    Ok(pool)
}
