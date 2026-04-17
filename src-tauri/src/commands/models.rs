use tauri::State;

use crate::db::DbPool;
use crate::models::ModelConfig;

#[tauri::command]
pub async fn load_model_configs(pool: State<'_, DbPool>) -> Result<Vec<ModelConfig>, String> {
    sqlx::query_as::<_, ModelConfig>(
        "SELECT id, name, provider, base_url, api_key, model FROM model_configs",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_model_configs(
    pool: State<'_, DbPool>,
    configs: Vec<ModelConfig>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM model_configs")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for cfg in &configs {
        sqlx::query(
            "INSERT INTO model_configs (id, name, provider, base_url, api_key, model) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&cfg.id)
        .bind(&cfg.name)
        .bind(&cfg.provider)
        .bind(&cfg.base_url)
        .bind(&cfg.api_key)
        .bind(&cfg.model)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}
