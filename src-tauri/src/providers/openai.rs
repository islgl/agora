use futures_util::StreamExt;
use serde::Serialize;
use tauri::ipc::Channel;

use crate::commands::chat::ChatStreamEvent;
use crate::models::{Message, ModelConfig};

#[derive(Serialize)]
struct ChatMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<ChatMessage<'a>>,
    stream: bool,
}

pub async fn stream(
    messages: Vec<Message>,
    model_config: ModelConfig,
    on_event: Channel<ChatStreamEvent>,
) -> Result<(), String> {
    let chat_messages: Vec<ChatMessage<'_>> = messages
        .iter()
        .map(|m| ChatMessage {
            role: super::role_str(&m.role),
            content: &m.content,
        })
        .collect();

    let request_body = ChatRequest {
        model: &model_config.model,
        messages: chat_messages,
        stream: true,
    };

    let url = format!(
        "{}/chat/completions",
        model_config.base_url.trim_end_matches('/')
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", model_config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let msg = format!("HTTP {}: {}", status, body);
        let _ = on_event.send(ChatStreamEvent::Error {
            message: msg.clone(),
        });
        return Err(msg);
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let bytes = chunk_result.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        loop {
            let Some(newline_pos) = buffer.find('\n') else {
                break;
            };
            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
            buffer.drain(..=newline_pos);

            if line.is_empty() {
                continue;
            }

            let Some(data) = line.strip_prefix("data:").map(str::trim_start) else {
                continue;
            };

            if data == "[DONE]" {
                let _ = on_event.send(ChatStreamEvent::Done);
                return Ok(());
            }

            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                    if !content.is_empty() {
                        let _ = on_event.send(ChatStreamEvent::Chunk {
                            content: content.to_string(),
                        });
                    }
                }
            }
        }
    }

    let _ = on_event.send(ChatStreamEvent::Done);
    Ok(())
}
