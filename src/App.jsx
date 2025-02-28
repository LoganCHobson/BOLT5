import React, {useState, useEffect} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {Button, Input, Space, List, Layout} from 'antd';

const {TextArea} = Input;
const {Sider, Content} = Layout;

function Chat() {
    const [messages, setMessages] = useState([]);  // To store chat messages
    const [input, setInput] = useState('');        // User input
    const [conversations, setConversations] = useState([]); // List of conversations
    const [currentConversation, setCurrentConversation] = useState(null); // Selected conversation
    const [newConvo, setNewConvo] = useState(true);  // Track if this is a new conversation

    const handleSend = async () => {
        if (!input.trim()) return;

        if (newConvo) {
            const title = await setupNewConvo(input);  // Wait for the title from getTitle
            setCurrentConversation(title);  // Set the new conversation title
            setConversations((prevConvos) => [...prevConvos, title]);  // Add the title to the conversations list
            setNewConvo(false);  // Reset newConvo flag

            // Don't add the title as a message, just initialize conversation
            setMessages([{role: 'system', content: `Conversation: ${title}`}]);
        }

        // Add the user's message to the chat history
        setMessages((prevMessages) => [
            ...prevMessages,
            {role: 'user', content: input}
        ]);

        // Clear input field
        setInput('');

        // Send the input to the backend via Tauri
        await postChatCompletion(input);
    };

    const postChatCompletion = async (prompt) => {
        await invoke('post_chat_completion', {
            prompt,
            role: 'user',
            conversation_title: currentConversation || 'new_conversation',
        });
    };

    const handleNewConversation = async () => {
        // Call the backend to create a new conversation
        const newConversation = `Conversation ${conversations.length + 1}`;
        setConversations([...conversations, newConversation]);
        setCurrentConversation(newConversation);
        setMessages([]); // Reset messages for the new conversation

        setNewConvo(true); // Set newConvo to true to trigger title generation after the first message
    };

    const setupNewConvo = async (userInput) => {
        // Simulate a call to backend to generate a title
        const title = await invoke('setup_new_conversation', {
            prompt: userInput,
            role: 'user',
        });

        return title;  // Return the generated title
    };

    const handleConversationClick = (conversation) => {
        setCurrentConversation(conversation);
        setMessages([]); // Reset messages when switching conversations
    };

    useEffect(() => {
        const listener = listen('response', (event) => {
            const content = event.payload;

            // If the message is streaming in chunks, update the chat progressively
            setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];

                if (lastMessage && lastMessage.role === 'ai') {
                    // Append to the last message's content if it's from the AI
                    return [
                        ...prevMessages.slice(0, -1),
                        {...lastMessage, content: lastMessage.content + content}
                    ];
                }

                // If no previous message from AI, create a new message
                return [
                    ...prevMessages,
                    {role: 'ai', content}
                ];
            });
        });

        return () => {
            listener.then((unsubscribe) => unsubscribe());
        };
    }, []);

    return (
        <Layout style={{height: '100vh'}}>
            {/* Sidebar for conversations */}
            <Sider width={300} style={{backgroundColor: '#f0f2f5', padding: '10px'}}>
                <Button
                    type="primary"
                    style={{marginBottom: 20, width: '100%'}}
                    onClick={handleNewConversation}
                >
                    New Conversation
                </Button>
                <List
                    bordered
                    dataSource={conversations}
                    renderItem={(item) => (
                        <List.Item onClick={() => handleConversationClick(item)} style={{cursor: 'pointer'}}>
                            <div>{item}</div>
                        </List.Item>
                    )}
                    style={{height: 'calc(100vh - 60px)', overflowY: 'auto'}}
                />
            </Sider>

            {/* Chat area */}
            <Layout style={{padding: '20px', display: 'flex', flexDirection: 'column', height: '100%'}}>
                <Content
                    style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div style={{flex: 1, overflowY: 'auto'}}>
                        <List
                            bordered
                            dataSource={messages}
                            renderItem={(item) => (
                                <List.Item>
                                    <div style={{textAlign: item.role === 'user' ? 'right' : 'left'}}>
                                        <strong>{item.role === 'user' ? 'You' : 'AI'}:</strong>
                                        <p>{item.content}</p>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </div>

                    {/* Input field at the bottom */}
                    <Space style={{width: '100%'}} direction="vertical">
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            rows={3}
                            placeholder="Type your message..."
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            style={{zIndex: 10}} // Ensure the input field is above other content
                        />
                        <Button type="primary" onClick={handleSend}>Send</Button>
                    </Space>
                </Content>
            </Layout>
        </Layout>
    );
}

export default Chat;
