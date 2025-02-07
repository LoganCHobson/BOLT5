use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ChatResponseContent {
    pub role: String,
    pub content: String,
    pub images: Option<Vec<String>>,
}
#[derive(Debug, Deserialize)]
pub struct ChatResponsePartial {
    pub model: String,
    pub created_at: String,
    pub message: ChatResponseContent,
    pub done: bool,
}

#[derive(Debug, Deserialize, Default)]
pub struct ChatResponseFinal {
    pub model: String,
    pub created_at: String,
    pub done: bool,
    pub total_duration: f64,
    pub load_duration: f64,
    pub prompt_eval_count: i32,
    pub prompt_eval_duration: i64,
    pub eval_count: i64,
    pub eval_duration: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

pub struct Config {
    pub endpoint: String,
    pub model: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            endpoint: "http://localhost:11434/api/chat".to_string(),
            model: "BOLT5:latest".to_string(),
        }
    }
}
