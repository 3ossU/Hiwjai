const CASHIER_API_URL = import.meta.env.VITE_CASHIER_API_URL || 'http://localhost:4002/api/cashier';

function getAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${CASHIER_API_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  return data;
}

export const cashierApi = {
  getPendingBills: () => request('/pending-bills'),
  submitPayment: (payload) => request('/payments', { method: 'POST', body: JSON.stringify(payload) }),
  getTodayTransactions: () => request('/transactions/today'),
  closeShift: () => request('/finance/close-shift', { method: 'POST' }),
};