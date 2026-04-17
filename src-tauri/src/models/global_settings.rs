use serde::{Deserialize, Serialize};

/// Single-row table holding provider endpoints + the shared API key.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct GlobalSettings {
    pub api_key: String,
    pub base_url_openai: String,
    pub base_url_anthropic: String,
    pub base_url_gemini: String,
}
