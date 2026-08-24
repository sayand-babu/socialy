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
  const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';
  const apiUrl = new URL(rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`);
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  apiUrl.pathname = '/ws';
  apiUrl.search = `ticket=${encodeURIComponent(ticket)}`;
  return apiUrl.toString();
};
