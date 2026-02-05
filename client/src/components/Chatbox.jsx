import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Loader2Icon, SendHorizonal } from 'lucide-react';
import { clearChat } from '../app/features/ChatSlice';
import { dummyChats } from '../assets/assets';

const Chatbox = () => {
  const dispatch = useDispatch();
  const { listing, isOpen, chatId } = useSelector((state) => state.chat);

  const user = { id: 'user_2' }; // logged-in user (mock)

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);

  /* ---------------- Fetch Chat ---------------- */
  const fetchChat = async () => {
    // mock fetch
    setChat(dummyChats[0]);
    setMessages(dummyChats[0].messages);
    setIsLoading(false);
  };

  /* ---------------- Open Chat ---------------- */
  useEffect(() => {
    if (listing && isOpen) {
      fetchChat();
    }
  }, [listing, isOpen]);

  /* ---------------- Reset on Close ---------------- */
  useEffect(() => {
    if (!isOpen) {
      setChat(null);
      setMessages([]);
      setNewMessage('');
      setIsLoading(true);
      setIsSending(false);
    }
  }, [isOpen]);

  /* ---------------- Auto Scroll ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /* ---------------- Send Message ---------------- */
  const handleSend = () => {
    if (!newMessage.trim()) return;

    setIsSending(true);

    const message = {
      id: Date.now(),
      sender_id: user.id,
      message: newMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage('');
    setIsSending(false);
  };

  if (!isOpen || !listing) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur z-100 flex items-center justify-center p-4">
      <div className="bg-white sm:rounded-lg shadow-2xl w-full max-w-2xl h-screen sm:h-[600px] flex flex-col">
        {/* ================= HEADER ================= */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 text-white p-4 sm:rounded-t-lg flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{listing.title}</h3>
            <p className="text-sm text-indigo-100 truncate">
              Chatting with {listing.owner?.name || 'Seller'}
            </p>
          </div>

          <button
            onClick={() => dispatch(clearChat())}
            className="p-1 rounded-lg hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= MESSAGES ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2Icon className="size-6 animate-spin text-indigo-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-gray-500 mb-1">No messages yet</p>
                <p className="text-sm text-gray-400">Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === user.id
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 pb-2 ${
                    message.sender_id === user.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {message.message}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      message.sender_id === user.id
                        ? 'text-indigo-200'
                        : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ================= INPUT ================= */}
        <div className="p-4 border-t border-gray-200 flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleSend}
            disabled={isSending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition disabled:opacity-50"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
