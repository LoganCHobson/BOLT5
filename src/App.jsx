import React, {useState, useEffect} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {Layout, Button, Input} from 'antd';
import './App.css';

const {Header, Content, Sider} = Layout;
const {TextArea} = Input;

function App() {
    const [input, setInput] = useState('');
    const [response, setResponse] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);

    useEffect(() => {
        const setupListener = async () => {
            await listen('response', (event) => {
                const newChunk = event.payload;
                setResponse((prev) => {
                    if (prev.endsWith(newChunk)) return prev;
                    return prev + newChunk;
                });
            });
        };

        setupListener();
    }, []);

    const handleNewConversation = async () => {
        setInput('');
        setResponse('Send a message to start the conversation');
        setIsListening(false);
        setSelectedConversation(null);
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        setResponse('');
        setIsListening(true);

        if (!selectedConversation) {
            try {
                const conversationTitle = await invoke('start_conversation', {
                    prompt: input,
                    role: 'user',
                });

                if (!conversationTitle) {
                    console.error('Error: conversationTitle is undefined or empty.');
                    return;
                }

                const newConversation = {
                    id: conversationTitle,
                    title: conversationTitle,
                    messages: [{role: 'user', content: input}],
                };

                setConversations((prevConversations) => [
                    ...prevConversations,
                    newConversation,
                ]);

                setSelectedConversation(newConversation);

                await invoke('post_chat_completion', {
                    prompt: input,
                    role: 'user',
                    conversationTitle: conversationTitle,
                });

            } catch (error) {
                console.error('Error starting a new conversation:', error);
            }

        } else {
            selectedConversation.messages.push({role: 'user', content: input});
            setConversations([...conversations]);

            try {
                await invoke('post_chat_completion', {
                    prompt: input,
                    role: 'user',
                    conversationTitle: selectedConversation.id,
                });
            } catch (error) {
                console.error('Error posting chat completion:', error);
            }
        }

        setInput('');
    };


    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        setResponse('');

        try {
            const conversationHistory = await invoke('get_conversation_history', {
                conversationId: conversation.id
            });


            setSelectedConversation(prevConversation => ({
                ...prevConversation,
                messages: conversationHistory
            }));
        } catch (error) {
            console.error('Error fetching conversation history:', error);

        }
    };

    return (
        <Layout style={{height: '100vh'}}>
            <Sider width={300} style={{padding: '20px'}}>
                <Button
                    type="primary"
                    onClick={handleNewConversation}
                    style={{marginBottom: '20px', width: '100%'}}
                >
                    New Conversation
                </Button>

                {conversations.map((item) => (
                    <Button
                        key={item.id}
                        type="text"
                        style={{width: '100%', marginBottom: '10px'}}
                        onClick={() => handleSelectConversation(item)}
                    >
                        {item.title}
                    </Button>
                ))}
            </Sider>

            <Layout style={{padding: '20px'}}>
                <Header style={{background: '#fff', padding: 0}}>
                    <h2>{selectedConversation ? selectedConversation.title : 'No Conversation Selected'}</h2>
                </Header>

                <Content style={{background: '#fff', minHeight: 280, display: 'flex', flexDirection: 'column'}}>
                    <div className="message-history" style={{
                        overflowY: 'auto',
                        flexGrow: 1,
                        marginBottom: '20px',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        background: '#f6f6f6',
                    }}>
                        <h3>{selectedConversation ? selectedConversation.title : 'No Conversation Selected'}</h3>

                        {(selectedConversation ? selectedConversation.messages : []).map((msg, index) => (
                            <div key={index} style={{marginBottom: '10px'}}>
                                <strong>{msg.role}: </strong>
                                <span>{msg.content}</span>
                            </div>
                        ))}

                        <div>{response || 'Send a message to start the conversation'}</div>
                    </div>

                    <div style={{width: '100%'}}>
                        <TextArea
                            rows={4}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            style={{marginBottom: '10px'}}
                        />
                        <Button
                            type="primary"
                            onClick={handleSendMessage}
                            style={{width: '100%'}}
                            disabled={isListening}
                        >
                            Send
                        </Button>
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}

export default App;
