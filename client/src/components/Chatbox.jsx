import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth, useUser } from '@clerk/clerk-react';
import { X, Loader2Icon, SendHorizonal, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
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
  const [shieldWarning, setShieldWarning] = useState(null);
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
      setError('');
      setShieldWarning(null);
      const message = await sendMessage(chat.id, text, await getToken());
      setMessages((previousMessages) =>
        previousMessages.some((item) => item.id === message.id)
          ? previousMessages
          : [...previousMessages, message]
      );
      setNewMessage('');
    } catch (requestError) {
      const responseData = requestError.response?.data;
      if (responseData?.isShieldBlocked) {
        setShieldWarning(responseData.message);
        toast.error('Message blocked by Scam Shield', { icon: '🛡️' });
      } else {
        setError(responseData?.message || 'Unable to send your message.');
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !listing) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur z-100 flex items-center justify-center p-4">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-2xl h-screen sm:h-[620px] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 sm:rounded-t-2xl flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Lock className="w-5 h-5 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{listing.title}</h3>
              <p className="text-xs text-indigo-100 flex items-center gap-1.5 mt-0.5">
                <span>Chatting with {listing.owner?.name || 'Seller'}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Escrow Protected
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch(clearChat())}
            className="p-2 rounded-xl hover:bg-white/20 transition cursor-pointer"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Shield Banner */}
        <div className="bg-amber-50/90 border-b border-amber-200/60 px-4 py-2 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Scam Shield Active:</strong> Never share phone numbers, UPI IDs, or agree to off-platform payment.
            </span>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2Icon className="size-6 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-center text-red-600 p-4">
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-xs max-w-sm">
                <ShieldCheck className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <p className="text-gray-800 font-semibold mb-1">Secure Escrow Conversation</p>
                <p className="text-xs text-gray-500">
                  Ask questions about metrics, growth, and audience. Always checkout on Socialy to stay protected.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{message.message}</p>
                    <p
                      className={`text-[10px] mt-1 text-right ${
                        isMe ? 'text-indigo-200' : 'text-gray-400'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Shield Warning Card (if blocked) */}
        {shieldWarning && (
          <div className="bg-red-50 border-t border-red-200 p-3 px-4 flex items-start gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-red-800">
              <strong className="font-semibold block mb-0.5">Message Blocked by Security Policy:</strong>
              {shieldWarning}
            </div>
            <button
              onClick={() => setShieldWarning(null)}
              className="text-red-500 hover:text-red-700 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message Input Footer */}
        <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
          <input
            value={newMessage}
            onChange={(event) => {
              setNewMessage(event.target.value);
              if (shieldWarning) setShieldWarning(null);
            }}
            onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && handleSend()}
            placeholder="Type your message (escrow protected)..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !chat || !newMessage.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 px-4 rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizonal className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
