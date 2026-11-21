// เรียก cashier-service (:4002) ผ่าน svc() กลาง เพื่อใช้ token และระบบ refresh token เดียวกับ service อื่น
import { svc } from '../../api';

const cashier = (path, opts) => svc('cashier', `/api/cashier${path}`, opts);

export const cashierApi = {
  getPendingBills: () => cashier('/pending-bills'),
  submitPayment: (payload) => cashier('/payments', { method: 'POST', body: payload }),
  getTodayTransactions: () => cashier('/transactions/today'),
  closeShift: () => cashier('/finance/close-shift', { method: 'POST' }),
};
