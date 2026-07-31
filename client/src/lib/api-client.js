const appParams = {
  appId: import.meta.env.VITE_APP_ID || '',
  token: null,
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return appParams.token || (typeof window !== 'undefined'
    ? (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
    : null);
}

function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (appParams.appId) headers['X-App-Id'] = appParams.appId;
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return { ...headers, ...extra };
}

async function handleResponse(res) {
  if (!res.ok) {
    let errorData;
    try { errorData = await res.json(); } catch { errorData = {}; }
    const msg = errorData.error?.message || errorData.message || `HTTP ${res.status}`;
    const error = /** @type {Error & { status?: number, data?: any }} */ (new Error(msg));
    error.status = res.status;
    error.data = errorData;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

export function setToast(fn) {
  setToast.fn = fn;
}
setToast.fn = null;

function log(method, path, status, data, error) {
  const icon = status >= 200 && status < 300 ? '✓' : status >= 400 ? '✗' : '→';
  const color = status >= 500 ? '#ef4444' : status >= 400 ? '#f59e0b' : status >= 200 ? '#22c55e' : '#6366f1';
  const payload = data ? ` ${typeof data === 'object' ? JSON.stringify(data).slice(0, 120) : data}` : '';
  const err = error ? ` ${error}` : '';
  console.debug(`%c${icon} ${method} ${path} ${status}${payload}${err}`, `color:${color}`);
}

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await handleResponse(res).catch((err) => {
    log(method, path, res.status, body, err.message);
    if (setToast.fn && res.status >= 400) setToast.fn(err.message, 'error');
    throw err;
  });
  log(method, path, res.status, body);
  return data;
}

export { request };
/**
 * @param {{ baseURL?: string, headers?: any, token?: string, interceptResponses?: boolean }} options
 */
export function createAxiosClient({ baseURL, headers, token, interceptResponses } = {}) {
  const clientHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) clientHeaders['Authorization'] = `Bearer ${token}`;

  const doFetch = async (method, url, data) => {
    const res = await fetch(`${baseURL}${url}`, {
      method,
      headers: clientHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse(res);
  };

  return {
    get: (url) => doFetch('GET', url),
    post: (url, data) => doFetch('POST', url, data),
    put: (url, data) => doFetch('PUT', url, data),
    delete: (url) => doFetch('DELETE', url),
  };
}

// Entity route mapping: entity name -> API path and response unwrapper
const entityRoutes = {
  Payment: { path: '/payments', unwrap: (data) => data.payments || [], unwrapOne: (data) => data.payment || data },
  Subscription: { path: '/subscriptions', unwrap: (data) => data.subscription ? [data.subscription] : [], unwrapOne: (data) => data.subscription || data },
  AutomationRule: { path: '/automation-rules', unwrap: (data) => data.rules || data, unwrapOne: (data) => data.rule || data },
  InstagramAccount: { path: '/ig-accounts', unwrap: (data) => data.accounts || data, unwrapOne: (data) => data.account || data },
};

/**
 * @typedef {Object} EntityService
 * @property {(filters?: any, orderBy?: string, limit?: number, offset?: number) => Promise<any>} filter
 * @property {(id: string|number) => Promise<any>} get
 * @property {(payload: any) => Promise<any>} create
 * @property {(id: string|number, payload: any) => Promise<any>} update
 * @property {(id: string|number) => Promise<any>} delete
 */

export const db = /** @type {{ auth: any, entities: Record<string, EntityService>, integrations: any }} */ ({
  auth: {
    isAuthenticated: async () => {
      return !!getToken();
    },
    me: async () => {
      const data = await request('GET', '/auth/me');
      const client = data?.client || data;
      return client ? { id: client.id, email: client.email, name: client.name, role: client.role } : null;
    },
    loginViaEmailPassword: async (email, password) => {
      const data = await request('POST', '/auth/login', { email, password });
      if (data.requiresTwoFactor) {
        return data;
      }
      if (data.token) {
        const storage = sessionStorage.getItem('remember_me') === 'true' ? localStorage : sessionStorage;
        storage.setItem('auth_token', data.token);
        appParams.token = data.token;
      }
      const client = data?.client || data;
      return { ...data, id: client?.id, email: client?.email, name: client?.name, role: client?.role };
    },
    loginWithProvider: async (provider, redirectTo) => {
      window.location.href = `${API_BASE}/oauth/${provider}?redirect_to=${encodeURIComponent(redirectTo || '/')}`;
    },
    loginViaTelegram: async (telegramUser) => {
      const data = await request('POST', '/oauth/telegram', telegramUser);
      return data;
    },
    register: async (payload) => {
      const data = await request('POST', '/auth/register', payload);
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        appParams.token = data.token;
      }
      return data;
    },
    verifyOtp: async ({ email, otpCode }) => {
      const data = await request('POST', '/auth/verify-otp', { email, code: otpCode });
      if (data.access_token) {
        localStorage.setItem('auth_token', data.access_token);
        appParams.token = data.access_token;
      }
      return data;
    },
    setToken: async (token) => {
      localStorage.setItem('auth_token', token);
      appParams.token = token;
    },
    updateProfile: async (payload) => {
      return request('PUT', '/auth/profile', payload);
    },
    changePassword: async (currentPassword, newPassword) => {
      return request('PUT', '/auth/password', { currentPassword, newPassword });
    },
    verify2FA: async (clientId, code) => {
      const data = await request('POST', '/auth/verify-2fa', { clientId, code });
      if (data.token) {
        const storage = sessionStorage.getItem('remember_me') === 'true' ? localStorage : sessionStorage;
        storage.setItem('auth_token', data.token);
        appParams.token = data.token;
      }
      return data;
    },
    toggle2FA: async (enabled) => {
      return request('POST', '/auth/toggle-2fa', { enabled });
    },
    authStatus: async () => {
      return request('GET', '/auth/status');
    },
    resendOtp: async (email) => {
      return request('POST', '/auth/resend-otp', { email });
    },
    resetPasswordRequest: async (email) => {
      return request('POST', '/auth/forgot-password', { email });
    },
    logout: async (redirectUrl) => {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('remember_me');
      appParams.token = null;
      if (redirectUrl) {
        window.location.href = `/login?redirect_to=${encodeURIComponent(redirectUrl)}`;
      }
    },
    redirectToLogin: async (redirectUrl) => {
      window.location.href = `/login?redirect_to=${encodeURIComponent(redirectUrl || '/')}`;
    },
  },

  entities: new Proxy({}, {
    get: (target, name) => {
      const route = entityRoutes[name];
      if (!route) {
        return {
          filter: async () => [],
          get: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
        };
      }

      return {
        filter: async (filters = {}, orderBy, limit, offset) => {
          const params = new URLSearchParams();
          if (filters && typeof filters === 'object') {
            Object.entries(filters).forEach(([k, v]) => {
              if (v !== undefined && v !== null) params.append(k, v);
            });
          }
          if (orderBy) params.append('order_by', orderBy);
          if (limit) params.append('limit', limit);
          if (offset) params.append('offset', offset);
          const qs = params.toString();
          const data = await request('GET', `${route.path}${qs ? `?${qs}` : ''}`);
          return route.unwrap(data) || [];
        },

        get: async (id) => {
          const data = await request('GET', `${route.path}/${id}`);
          return route.unwrapOne(data) || data;
        },

        create: async (payload) => {
          const data = await request('POST', `${route.path}`, payload);
          return route.unwrapOne(data) || data;
        },

        update: async (id, payload) => {
          const data = await request('PUT', `${route.path}/${id}`, payload);
          return route.unwrapOne(data) || data;
        },

        delete: async (id) => {
          return request('DELETE', `${route.path}/${id}`);
        },
      };
    },
  }),

  integrations: {
    Core: {
      UploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/integrations/core/upload`, {
          method: 'POST',
          headers: {
            ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}),
          },
          body: formData,
        });
        const data = await handleResponse(res);
        return data || { file_url: '' };
      },
    },
  },
});
