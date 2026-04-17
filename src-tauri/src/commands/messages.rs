use tauri::State;

use crate::db::DbPool;
use crate::models::Message;

#[tauri::command]
pub async fn load_messages(
    pool: State<'_, DbPool>,
    conversation_id: String,
) -> Result<Vec<Message>, String> {
    sqlx::query_as::<_, Message>(
        "SELECT id, conversation_id, role, content, created_at \
         FROM messages \
         WHERE conversation_id = ? \
         ORDER BY created_at ASC",
    )
    .bind(&conversation_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_message(pool: State<'_, DbPool>, message: Message) -> Result<(), String> {
    // Upsert — same message id rewrites content (streaming finalization).
    sqlx::query(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) \
         VALUES (?, ?, ?, ?, ?) \
         ON CONFLICT(id) DO UPDATE SET content = excluded.content",
    )
    .bind(&message.id)
    .bind(&message.conversation_id)
    .bind(&message.role)
    .bind(&message.content)
    .bind(message.created_at)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
