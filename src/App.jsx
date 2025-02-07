import {useState, useEffect} from "react";
import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";
import "./App.css";

function App() {
    const [input, setInput] = useState("");
    const [response, setResponse] = useState("");
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        const setupListener = async () => {
            await listen("response", (event) => {
                console.log('Listener triggered:', event);
                const newChunk = event.payload;
                console.log('Received chunk:', newChunk);
                setResponse((prev) => {
                    if (prev.endsWith(newChunk)) {
                        return prev;
                    }
                    return prev + newChunk;
                });
            });
        };

        setupListener();
    }, []);

    async function handleSend() {
        try {
            setResponse("");
            setIsListening(true);

            await invoke("post_chat_completion", {prompt: input, role: "user"});
        } catch (error) {
            console.error("Error during chat completion:", error);
        } finally {
            setIsListening(false);
        }
    }

    return (
        <main className="container">
            <h1>LLM Chat</h1>
            <form
                className="row"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
            >
                <input
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    placeholder="Type your message..."
                    disabled={isListening}
                />
                <button type="submit" disabled={isListening}>Send</button>
            </form>

            <p>{response}</p>
            {isListening && <p>Listening for response...</p>}
        </main>
    );
}

export default App;
