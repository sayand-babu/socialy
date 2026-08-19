import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth, useUser } from '@clerk/clerk-react';
import { X, Loader2Icon, SendHorizonal } from 'lucide-react';
import { clearChat } from '../app/features/ChatSlice';
import {
  getChatSocketUrl,
  getMessages,
  getOrCreateChat,
  getSocketTicket,
  sendMessage,
} from '../services/chatService';

const Chatbox = () => {
  const dispatch = useDispatch();
  const { listing, isOpen, chatId } = useSelector((state) => state.chat);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const activeChatIdRef = useRef(null);

  useEffect(() => {
    activeChatIdRef.current = chat?.id || null;
  }, [chat?.id]);

  useEffect(() => {
    if (!user) return undefined;

    let socket;
    let reconnectTimer;
    let stopped = false;

    const connect = async () => {
      try {
        const ticket = await getSocketTicket(await getToken());
        if (stopped) return;

        socket = new WebSocket(getChatSocketUrl(ticket));
        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data);
          if (payload.type !== 'message:new') return;

          window.dispatchEvent(new CustomEvent('socialy:chat-message', { detail: payload }));
          if (payload.chatId === activeChatIdRef.current) {
            setMessages((current) =>
              current.some((message) => message.id === payload.message.id)
                ? current
                : [...current, payload.message]
            );
          }
        };
        socket.onclose = () => {
          if (!stopped) reconnectTimer = setTimeout(connect, 3000);
        };
        socket.onerror = () => socket.close();
      } catch {
        if (!stopped) reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [getToken, user]);

  useEffect(() => {
    if (!listing || !isOpen) {
      setChat(null);
      setMessages([]);
      setError('');
      return undefined;
    }
    let cancelled = false;

    const loadChat = async () => {
      try {
        setIsLoading(true);
        setError('');
        setChat(null);
        setMessages([]);
        const token = await getToken();
        const activeChat = chatId ? { id: chatId } : await getOrCreateChat(listing.id, token);
        const data = await getMessages(activeChat.id, token);
        if (!cancelled) {
          setChat(data.chat);
          setMessages(data.messages);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.response?.data?.message || 'Unable to load this conversation.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadChat();
    return () => { cancelled = true; };
  }, [chatId, getToken, isOpen, listing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !chat?.id || !user) return;
    try {
      setIsSending(true);
      const message = await sendMessage(chat.id, text, await getToken());
      setMessages((previousMessages) =>
        previousMessages.some((item) => item.id === message.id)
          ? previousMessages
          : [...previousMessages, message]
      );
      setNewMessage('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send your message.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !listing) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur z-100 flex items-center justify-center p-4">
      <div className="bg-white sm:rounded-lg shadow-2xl w-full max-w-2xl h-screen sm:h-[600px] flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 text-white p-4 sm:rounded-t-lg flex items-center justify-between">
          <div className="min-w-0"><h3 className="font-semibold truncate">{listing.title}</h3><p className="text-sm text-indigo-100 truncate">Chatting with {listing.owner?.name || 'Seller'}</p></div>
          <button onClick={() => dispatch(clearChat())} className="p-1 rounded-lg hover:bg-white/20 transition" aria-label="Close chat"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
          {isLoading ? <div className="flex items-center justify-center h-full"><Loader2Icon className="size-6 animate-spin text-indigo-600" /></div> : error ? <div className="flex items-center justify-center h-full text-center text-red-600"><p>{error}</p></div> : messages.length === 0 ? <div className="flex items-center justify-center h-full text-center"><div><p className="text-gray-500 mb-1">No messages yet</p><p className="text-sm text-gray-400">Start the conversation!</p></div></div> : messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] rounded-lg p-3 pb-2 ${message.sender_id === user?.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}><p className="text-sm break-words whitespace-pre-wrap">{message.message}</p><p className={`text-[10px] mt-1 ${message.sender_id === user?.id ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(message.createdAt).toLocaleTimeString()}</p></div></div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2"><input value={newMessage} onChange={(event) => setNewMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><button onClick={handleSend} disabled={isSending || !chat} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition disabled:opacity-50" aria-label="Send message"><SendHorizonal className="w-4 h-4" /></button></div>
      </div>
    </div>
  );
};

export default Chatbox;
