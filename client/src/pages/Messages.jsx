import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth, useUser } from '@clerk/clerk-react';
import { MessageCircle, Search } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { setChat } from '../app/features/ChatSlice';
import { getChats } from '../services/chatService';

const Messages = () => {
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d');
  };

  const fetchUserChats = async () => {
    try {
      setLoading(true);
      setChats(await getChats(await getToken()));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserChats();
  }, [getToken]);

  useEffect(() => {
    const handleIncomingMessage = (event) => {
      const { chatId, message, updatedAt } = event.detail;
      setChats((currentChats) => {
        const chat = currentChats.find((item) => item.id === chatId);
        if (!chat) return currentChats;

        return [
          {
            ...chat,
            lastMessage: message.message,
            lastMessageSenderId: message.sender_id,
            updatedAt,
          },
          ...currentChats.filter((item) => item.id !== chatId),
        ];
      });
    };

    window.addEventListener('socialy:chat-message', handleIncomingMessage);
    return () => window.removeEventListener('socialy:chat-message', handleIncomingMessage);
  }, [getToken]);

  const filteredChats = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      const chatUser = chat.chatUserId === user?.id ? chat.ownerUser : chat.chatUser;
      return chat.listing?.title?.toLowerCase().includes(query) || chatUser?.name?.toLowerCase().includes(query);
    });
  }, [chats, searchQuery, user?.id]);

  return (
    <div className="mx-auto min-h-screen px-6 md:px-16 lg:px-24 xl:px-32">
      <div className="py-10">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800 mb-2">Messages</h1><p className="text-gray-600">Chat with buyers and sellers</p></div>
        <div className="relative max-w-xl mb-8"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Search conversations..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-indigo-500" /></div>
        {loading ? <div className="text-center text-gray-500 py-20">Loading messages...</div> : error ? (
          <div className="text-center py-20"><p className="text-red-600">{error}</p><button type="button" onClick={fetchUserChats} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Try Again</button></div>
        ) : filteredChats.length === 0 ? (
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-16 text-center"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><MessageCircle className="w-8 h-8 text-gray-400" /></div><h3 className="text-xl font-medium text-gray-800 mb-2">{searchQuery ? 'No chats found' : 'No messages yet'}</h3><p className="text-gray-600">{searchQuery ? 'Try a different search term' : 'Start a conversation by viewing a listing and clicking “Chat”.'}</p></div>
        ) : <div className="bg-white rounded-lg shadow-xs border border-gray-200 divide-y divide-gray-200">
          {filteredChats.map((chat) => {
            const chatUser = chat.chatUserId === user?.id ? chat.ownerUser : chat.chatUser;
            return <button key={chat.id} onClick={() => dispatch(setChat({ chatId: chat.id, listing: chat.listing }))} className="w-full p-4 hover:bg-gray-50 transition-colors text-left"><div className="flex items-start space-x-4"><img src={chatUser?.image} alt={chatUser?.name || 'User'} className="w-12 h-12 rounded-lg object-cover" /><div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-1"><h3 className="font-semibold text-gray-800 truncate">{chat.listing?.title}</h3><span className="text-xs text-gray-500 ml-2">{formatTime(chat.updatedAt)}</span></div><p className="text-sm text-gray-600 truncate mb-1">{chatUser?.name}</p><p className="text-sm text-gray-500 truncate">{chat.lastMessage || 'No messages yet'}</p></div></div></button>;
          })}
        </div>}
      </div>
    </div>
  );
};

export default Messages;
