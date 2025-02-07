mod model;

use crate::model::{ChatRequest, Config, Message};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use tauri::{Emitter, Manager};

#[tauri::command]
async fn post_chat_completion(
    prompt: String,
    role: String,
    window: tauri::Window,
) -> Result<(), String> {
    let client = Client::new();

    println!("Sending: {}", prompt);
    let body = ChatRequest {
        model: Config::default().model,
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        stream: true,
    };

    let mut response = client
        .post(Config::default().endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Error with request: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to get a valid response from the API: {}",
            response.status()
        ));
    }

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Error reading chunk: {}", e))?
    {
        let chunk_str = String::from_utf8_lossy(&chunk);

        let parsed_chunk: Value =
            serde_json::from_str(&chunk_str).map_err(|e| format!("Error parsing JSON: {}", e))?;

        if let Some(content) = parsed_chunk["message"]["content"].as_str() {
            println!("Received chunk: {}", content);
            window
                .emit("response", content.to_string())
                .map_err(|e| format!("Error emitting chunk: {}", e))?;
        }

        if parsed_chunk["done"].as_bool().unwrap_or(false) {
            break;
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![post_chat_completion])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
