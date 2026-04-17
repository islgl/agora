use tauri::State;
use uuid::Uuid;

use crate::db::DbPool;
use crate::models::Conversation;

#[tauri::command]
pub async fn load_conversations(pool: State<'_, DbPool>) -> Result<Vec<Conversation>, String> {
    sqlx::query_as::<_, Conversation>(
        "SELECT id, title, created_at, model_id \
         FROM conversations \
         ORDER BY created_at DESC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_conversation(
    pool: State<'_, DbPool>,
    title: String,
    model_id: String,
) -> Result<Conversation, String> {
    let conversation = Conversation {
        id: Uuid::new_v4().to_string(),
        title,
        created_at: now_millis(),
        model_id,
    };

    sqlx::query(
        "INSERT INTO conversations (id, title, created_at, model_id) \
         VALUES (?, ?, ?, ?)",
    )
    .bind(&conversation.id)
    .bind(&conversation.title)
    .bind(conversation.created_at)
    .bind(&conversation.model_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(conversation)
}

#[tauri::command]
pub async fn delete_conversation(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    // ON DELETE CASCADE on messages handles message cleanup.
    sqlx::query("DELETE FROM conversations WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn rename_conversation(
    pool: State<'_, DbPool>,
    id: String,
    title: String,
) -> Result<(), String> {
    sqlx::query("UPDATE conversations SET title = ? WHERE id = ?")
        .bind(&title)
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
