import api from './api';

const authConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getOrCreateChat = async (listingId, token) => {
  const response = await api.post(`/chats/${listingId}`, {}, authConfig(token));
  return response.data.chat;
};

export const getChats = async (token) => {
  const response = await api.get('/chats', authConfig(token));
  return response.data.chats || [];
};

export const getMessages = async (chatId, token) => {
  const response = await api.get(`/chats/${chatId}/messages`, authConfig(token));
  return response.data;
};

export const sendMessage = async (chatId, message, token) => {
  const response = await api.post(`/chats/${chatId}/messages`, { message }, authConfig(token));
  return response.data.message;
};

export const getSocketTicket = async (token) => {
  const response = await api.post('/chats/socket-ticket', {}, authConfig(token));
  return response.data.ticket;
};

export const getChatSocketUrl = (ticket) => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    const parsed = new URL(envUrl);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = '/ws';
    parsed.search = `ticket=${encodeURIComponent(ticket)}`;
    return parsed.toString();
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws?ticket=${encodeURIComponent(ticket)}`;
  }
  return `ws://localhost:3000/ws?ticket=${encodeURIComponent(ticket)}`;
};
