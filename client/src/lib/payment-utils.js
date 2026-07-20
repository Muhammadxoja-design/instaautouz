const API_BASE = import.meta.env.VITE_API_URL || '/api';

const token = () => localStorage.getItem('auth_token');

async function authFetch(url, opts = {}) {
  const headers = { ...opts.headers };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const PROVIDERS = [
  { id: 'click', name: 'Click', logo: '' },
  { id: 'payme', name: 'Payme', logo: '' },
  { id: 'uzum', name: 'Uzum Bank', logo: '' },
  { id: 'paynet', name: 'Paynet', logo: '' },
];

export const AMOUNTS = [50000, 100000, 200000, 500000];

export function parseProviderReturn(provider, searchParams) {
  const parsers = {
    click: () => {
      const clickTransId = searchParams.get('click_trans_id');
      const merchantTransId = searchParams.get('merchant_trans_id');
      const status = searchParams.get('status');
      const error = searchParams.get('error');
      if (!merchantTransId) return null;
      return {
        provider_transaction_id: merchantTransId,
        provider_status: status,
        success: status === '0',
        cancelled: status === '-1',
        failed: status === '-2' || (status && status !== '0' && status !== '-1'),
      };
    },
    payme: () => {
      const transaction = searchParams.get('transaction');
      const status = searchParams.get('status');
      const error = searchParams.get('error');
      if (!transaction) return null;
      return {
        provider_transaction_id: transaction,
        provider_status: status,
        success: status === '0',
        cancelled: status === '1',
        failed: status === '2',
      };
    },
    uzum: () => {
      const transactionId = searchParams.get('transactionId');
      const status = searchParams.get('status');
      if (!transactionId) return null;
      return {
        provider_transaction_id: transactionId,
        provider_status: status,
        success: status === 'success' || status === 'paid' || status === 'confirmed',
        cancelled: status === 'cancelled' || status === 'rejected',
        failed: status === 'failed' || status === 'error',
      };
    },
    paynet: () => {
      const transactionId = searchParams.get('transaction');
      const status = searchParams.get('status');
      if (!transactionId) return null;
      return {
        provider_transaction_id: transactionId,
        provider_status: status,
        success: status === '1' || status === 'success',
        cancelled: status === '0' || status === 'cancelled',
        failed: status === '-1' || status === 'failed',
      };
    },
  };
  return (parsers[provider] || parsers.click)();
}

export function validateProviderEnv(provider) {
  const envMap = {
    click: ['VITE_CLICK_SERVICE_ID', 'VITE_CLICK_MERCHANT_ID'],
    payme: ['VITE_PAYME_MERCHANT_ID'],
    uzum: ['VITE_UZUM_MERCHANT_ID'],
    paynet: ['VITE_PAYNET_MERCHANT_ID'],
  };
  return (envMap[provider] || []).filter((v) => !import.meta.env[v]);
}

export async function buildProviderUrl(provider, { amount, transactionId, returnUrl, paymentId }) {
  if (provider === 'click') {
    const params = new URLSearchParams({
      service_id: import.meta.env.VITE_CLICK_SERVICE_ID,
      merchant_id: import.meta.env.VITE_CLICK_MERCHANT_ID,
      amount: amount.toString(),
      transaction_param: transactionId,
      return_url: returnUrl,
    });
    return { url: `https://my.click.uz/services/pay?${params.toString()}`, method: 'redirect' };
  }
  const data = await authFetch(`${API_BASE}/payments/provider-url`, {
    method: 'POST',
    body: JSON.stringify({ provider, amount, transaction_id: transactionId, return_url: returnUrl }),
  });
  if (data.redirect_url) {
    return { url: data.redirect_url, method: 'redirect', payment: data.payment };
  }
  return { url: data.redirect_url, method: 'redirect' };
}

export async function verifyPaymentWithProvider(paymentId) {
  const data = await authFetch(`${API_BASE}/payments/verify/${paymentId}`);
  return { status: data.status, paid: data.paid, ...data };
}

export async function prepareProviderPayment(provider, { amount, merchantTransId, returnUrl }) {
  const data = await authFetch(`${API_BASE}/payments/provider-url`, {
    method: 'POST',
    body: JSON.stringify({ provider, amount, transaction_id: merchantTransId, return_url: returnUrl }),
  });
  return data;
}

export function getProviderStatusDisplay(status) {
  const map = {
    paid: { icon: 'CheckCircle2', color: 'text-accent', bg: 'bg-accent/10', label: "To'langan" },
    pending: { icon: 'Clock', color: 'text-chart-3', bg: 'bg-chart-3/10', label: 'Kutilmoqda' },
    failed: { icon: 'AlertTriangle', color: 'text-destructive', bg: 'bg-destructive/10', label: 'Xato' },
    cancelled: { icon: 'AlertTriangle', color: 'text-muted-foreground', bg: 'bg-muted', label: 'Bekor qilingan' },
  };
  return map[status] || map.pending;
}

export function makeMerchantTransactionId(userId) {
  const suffix = (userId?.slice?.(-6) || '000000').replace(/[^a-zA-Z0-9]/g, 'X');
  return `IAU-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
