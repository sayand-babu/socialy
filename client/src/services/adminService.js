import api from './api';

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

export const getAdminDashboard = async (token) => {
  const res = await api.get('/admin/dashboard', authHeaders(token));
  return res.data;
};

export const getUnverifiedCredentials = async (token) => {
  const res = await api.get('/admin/credentials/unverified', authHeaders(token));
  return res.data.listings || [];
};

export const verifyCredential = async (listingId, token) => {
  const res = await api.post('/admin/credentials/verify', { listingId }, authHeaders(token));
  return res.data;
};

export const getPendingCredentialChanges = async (token) => {
  const res = await api.get('/admin/credentials/change', authHeaders(token));
  return res.data.listings || [];
};

export const changeCredential = async (listingId, newCredential, token) => {
  const res = await api.post(
    '/admin/credentials/change',
    { listingId, newCredential },
    authHeaders(token)
  );
  return res.data;
};

export const getAllAdminListings = async (token) => {
  const res = await api.get('/admin/listings', authHeaders(token));
  return res.data.listings || [];
};

export const updateAdminListingStatus = async (listingId, status, token) => {
  const res = await api.put(
    `/admin/listings/${listingId}/status`,
    { status },
    authHeaders(token)
  );
  return res.data;
};

export const getAllAdminTransactions = async (token) => {
  const res = await api.get('/admin/transactions', authHeaders(token));
  return res.data.transactions || [];
};

export const getAllAdminWithdrawals = async (token) => {
  const res = await api.get('/admin/withdrawals', authHeaders(token));
  return res.data.withdrawals || [];
};

export const approveWithdrawal = async (withdrawalId, token) => {
  const res = await api.put(`/admin/withdrawals/${withdrawalId}/approve`, {}, authHeaders(token));
  return res.data;
};

export const checkAdminRole = async (token) => {
  const res = await api.get('/admin/check-role', authHeaders(token));
  return res.data;
};

