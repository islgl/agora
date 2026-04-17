use futures_util::StreamExt;
use serde::Serialize;
use tauri::ipc::Channel;

use crate::commands::chat::ChatStreamEvent;
use crate::models::{Message, ModelConfig, Role};

#[derive(Serialize)]
struct Part<'a> {
    text: &'a str,
}

#[derive(Serialize)]
struct Content<'a> {
    role: &'a str,
    parts: Vec<Part<'a>>,
}

#[derive(Serialize)]
struct SystemInstruction {
    parts: Vec<SystemPart>,
}

#[derive(Serialize)]
struct SystemPart {
    text: String,
}

#[derive(Serialize)]
struct GeminiRequest<'a> {
    contents: Vec<Content<'a>>,
    #[serde(rename = "systemInstruction", skip_serializing_if = "Option::is_none")]
    system_instruction: Option<SystemInstruction>,
}

pub async fn stream(
    messages: Vec<Message>,
    model_config: ModelConfig,
    on_event: Channel<ChatStreamEvent>,
) -> Result<(), String> {
    let mut system_parts: Vec<SystemPart> = Vec::new();
    let contents: Vec<Content<'_>> = messages
        .iter()
        .filter_map(|m| match m.role {
            Role::System => {
                system_parts.push(SystemPart {
                    text: m.content.clone(),
                });
                None
            }
            Role::User => Some(Content {
                role: "user",
                parts: vec![Part { text: &m.content }],
            }),
            // Gemini uses "model" instead of "assistant".
            Role::Assistant => Some(Content {
                role: "model",
                parts: vec![Part { text: &m.content }],
            }),
        })
        .collect();

    let system_instruction = if system_parts.is_empty() {
        None
    } else {
        Some(SystemInstruction {
            parts: system_parts,
        })
    };

    let request_body = GeminiRequest {
        contents,
        system_instruction,
    };

    let url = format!(
        "{}/v1beta/models/{}:streamGenerateContent?alt=sse",
        model_config.base_url.trim_end_matches('/'),
        model_config.model,
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("x-goog-api-key", &model_config.api_key)
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

    let mut byte_stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        let bytes = chunk_result.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        loop {
            let Some(newline_pos) = buffer.find('\n') else {
                break;
            };
            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
            buffer.drain(..=newline_pos);

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            let Some(data) = line.strip_prefix("data:").map(str::trim_start) else {
                continue;
            };

            let Ok(json) = serde_json::from_str::<serde_json::Value>(data) else {
                continue;
            };

            if let Some(parts) = json["candidates"][0]["content"]["parts"].as_array() {
                for part in parts {
                    if let Some(text) = part["text"].as_str() {
                        if !text.is_empty() {
                            let _ = on_event.send(ChatStreamEvent::Chunk {
                                content: text.to_string(),
                            });
                        }
                    }
                }
            }

            if let Some(err_msg) = json["error"]["message"].as_str() {
                let _ = on_event.send(ChatStreamEvent::Error {
                    message: err_msg.to_string(),
                });
                return Err(err_msg.to_string());
            }
        }
    }

    let _ = on_event.send(ChatStreamEvent::Done);
    Ok(())
}
