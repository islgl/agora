use tauri::State;

use crate::db::DbPool;
use crate::models::GlobalSettings;

#[tauri::command]
pub async fn load_global_settings(pool: State<'_, DbPool>) -> Result<GlobalSettings, String> {
    sqlx::query_as::<_, GlobalSettings>(
        "SELECT api_key, base_url_openai, base_url_anthropic, base_url_gemini \
         FROM global_settings WHERE id = 1",
    )
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_global_settings(
    pool: State<'_, DbPool>,
    settings: GlobalSettings,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE global_settings \
         SET api_key = ?, base_url_openai = ?, base_url_anthropic = ?, base_url_gemini = ? \
         WHERE id = 1",
    )
    .bind(&settings.api_key)
    .bind(&settings.base_url_openai)
    .bind(&settings.base_url_anthropic)
    .bind(&settings.base_url_gemini)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
