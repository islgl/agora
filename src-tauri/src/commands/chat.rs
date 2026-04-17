use serde::Serialize;
use tauri::ipc::Channel;

use crate::models::{Message, ModelConfig, Provider};
use crate::providers::{anthropic, gemini, openai};

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChatStreamEvent {
    Chunk { content: String },
    Done,
    Error { message: String },
}

#[tauri::command]
pub async fn stream_chat(
    messages: Vec<Message>,
    model_config: ModelConfig,
    on_event: Channel<ChatStreamEvent>,
) -> Result<(), String> {
    match model_config.provider {
        Provider::Openai => openai::stream(messages, model_config, on_event).await,
        Provider::Anthropic => anthropic::stream(messages, model_config, on_event).await,
        Provider::Gemini => gemini::stream(messages, model_config, on_event).await,
    }
}
