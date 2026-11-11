const BASE = 'http://localhost:3001/api';

export const store = {
  save(accessToken, refreshToken, user) {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  },
  token() {
    return localStorage.getItem('token');
  },
  refreshToken() {
    return localStorage.getItem('refreshToken');
  },
  user() {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

// กันหลาย request ที่ได้ 401 พร้อมกันแล้วยิง refresh ซ้ำหลายรอบ
let refreshing = null;

function refreshTokens() {
  if (!refreshing) {
    refreshing = (async () => {
      const rt = store.refreshToken();
      if (!rt) throw new Error('no refresh token');

      const res = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) throw new Error('refresh failed');

      const d = await res.json();
      store.save(d.accessToken, d.refreshToken, d.user);
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

function request(path, { method, body }) {
  const token = store.token();
  return fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function api(path, { method = 'GET', body } = {}) {
  let res = await request(path, { method, body });

  const skipRefresh = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');

  // access token หมดอายุ ขอใหม่แล้วลองยิงซ้ำ 1 ครั้ง
  if (res.status === 401 && !skipRefresh && store.refreshToken()) {
    try {
      await refreshTokens();
      res = await request(path, { method, body });
    } catch {
      store.clear();
      window.location.reload(); // กลับหน้า Login
      throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
  return data;
}

export function logout() {
  store.clear();
}