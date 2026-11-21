import { ROLES } from './adminData';

export const RoleBadge = ({ role }) => {
  const r = ROLES[role] || { label: role, icon: 'bi-person', cls: 'bg-gray-50 text-gray-600 ring-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${r.cls}`}>
      <i className={`bi ${r.icon}`}></i>{r.label}
    </span>
  );
};

export const StatusBadge = ({ status }) =>
  status === 'active' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>ใช้งานอยู่
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-500">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>ถูกระงับ
    </span>
  );

export const PageHeader = ({ icon, title, subtitle, children }) => (
  <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl hw-grad-soft-br text-white flex items-center justify-center shadow-lg shadow-sky-200">
        <i className={`bi ${icon} text-2xl`}></i>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </div>
);

export const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-3xl border border-sky-100 shadow-sm shadow-sky-100/60 ${className}`}>{children}</div>
);

export const Modal = ({ open, title, icon, onClose, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sky-900/20 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-sky-200 overflow-hidden">
        <div className="px-6 py-4 hw-grad-soft text-white flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2"><i className={`bi ${icon}`}></i>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/20 cursor-pointer"><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 bg-sky-50/50 border-t border-sky-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-slate-600 mb-1">
      {label} {required && <span className="text-rose-400">*</span>}
    </span>
    {children}
  </label>
);

export const Loading = ({ text = 'กำลังโหลดข้อมูล...' }) => (
  <div className="py-20 flex flex-col items-center justify-center text-sky-400 gap-3">
    <i className="bi bi-arrow-repeat animate-spin text-3xl"></i>
    <p className="text-sm text-slate-400">{text}</p>
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 text-sm flex items-center gap-3">
    <i className="bi bi-cloud-slash text-2xl"></i>
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button onClick={onRetry} className="px-4 py-2 rounded-xl bg-white text-rose-500 font-semibold hover:bg-rose-100 cursor-pointer">
        ลองใหม่
      </button>
    )}
  </div>
);

export const Toast = ({ toast }) =>
  toast ? (
    <div
      className={`fixed bottom-6 right-6 z-[60] max-w-sm px-5 py-3 rounded-2xl bg-white border shadow-xl text-sm font-medium flex items-start gap-2 ${
        toast.type === 'error' ? 'border-rose-100 shadow-rose-100 text-rose-600' : 'border-sky-100 shadow-sky-100'
      }`}
    >
      <i className={`bi mt-0.5 ${toast.type === 'error' ? 'bi-exclamation-circle-fill text-rose-500' : 'bi-check-circle-fill text-sky-500'}`}></i>
      <span>{toast.msg}</span>
    </div>
  ) : null;
