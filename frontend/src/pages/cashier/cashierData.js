// ข้อมูลและฟังก์ชันคำนวณของหน้าแคชเชียร์
// ข้อมูลคิว/รายการชำระมาจาก cashier-service (:4002) ผ่าน cashierApi.js

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const METHODS = [
  { key: 'เงินสด', icon: 'bi-cash-stack' },
  { key: 'PromptPay', icon: 'bi-qr-code' },
  { key: 'บัตรเครดิต', icon: 'bi-credit-card' },
];
export const CASH = 'เงินสด';
export const PROMPTPAY = 'PromptPay';
export const CARD = 'บัตรเครดิต';

/* ---------- PromptPay ---------- */
// ใส่ PromptPay ID จริงของคลินิก (เบอร์มือถือ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก)
// ค่าเริ่มต้นเป็นเลขทดสอบ สแกนได้แต่โอนเข้าไม่ได้
export const PROMPTPAY_ACCOUNT = { id: '0000000000000', name: 'คลินิกสุขภาพจิต HiwJai' };
export const isTestPromptPay = /^0+$/.test(PROMPTPAY_ACCOUNT.id);

const tlv = (tag, value) => `${tag}${String(value.length).padStart(2, '0')}${value}`;

// CRC16-CCITT (0xFFFF, poly 0x1021) ตามมาตรฐาน EMVCo
const crc16 = (s) => {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
};

// สร้างข้อความสำหรับ QR พร้อมเพย์ (Thai QR Payment) แบบระบุจำนวนเงิน
export function promptPayPayload(id, amount) {
  const digits = String(id).replace(/\D/g, '');
  const target =
    digits.length >= 15 ? tlv('03', digits)                           // e-Wallet ID
    : digits.length >= 13 ? tlv('02', digits)                         // เลขประจำตัวผู้เสียภาษี / บัตรประชาชน
    : tlv('01', `0066${digits.replace(/^0/, '')}`.padStart(13, '0')); // เบอร์มือถือ
  const body =
    tlv('00', '01') +
    tlv('01', amount ? '12' : '11') +
    tlv('29', tlv('00', 'A000000677010111') + target) +
    tlv('53', '764') +
    (amount ? tlv('54', amount.toFixed(2)) : '') +
    tlv('58', 'TH') +
    '6304';
  return body + crc16(body);
}

/* ---------- บัตรเครดิต ---------- */
export const CARD_BRANDS = ['VISA', 'Mastercard', 'JCB', 'UnionPay', 'AMEX'];

// ข้อความรายละเอียดช่องทางชำระ (ใช้ในใบเสร็จ/ตารางสรุป)
export const methodDetailText = (tx) => {
  const d = tx.detail;
  if (!d) return '';
  if (tx.method === PROMPTPAY) return `Ref: ${d.ref}`;
  if (tx.method === CARD) return `${d.brand} •••• ${d.last4} · Approval ${d.approval}`;
  return '';
};

/* ---------- format ---------- */
export const fmt2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoney = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const parseMoney = (s) => parseFloat(String(s).replace(/,/g, '')) || 0;
export const round2 = (n) => Math.round(n * 100) / 100;

export const todayLabel = () => {
  const d = new Date();
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/* ---------- คำนวณยอด ---------- */
const sumBy = (items, pred) => round2(items.filter(pred).reduce((s, i) => s + i.qty * i.price, 0));
export const consultTotal = (items) => sumBy(items, (i) => i.type === 'แพทย์');
export const pharmacyTotal = (items) => sumBy(items, (i) => i.type === 'ฝ่ายยา');
export const serviceTotal = (items) => sumBy(items, (i) => i.type === 'บริการ');
export const grandTotal = (items) => round2(consultTotal(items) + pharmacyTotal(items) + serviceTotal(items));

// เลือกคิวถัดไป: เอาคนที่พร้อมชำระก่อน ถ้าไม่มีค่อยเอาคนแรก
export const pickNextHn = (patients) => (patients.find((p) => p.status === 'ready') || patients[0])?.hn ?? null;

// รายการของวันนี้ (รายการตัวอย่างที่ไม่มีวันที่ ถือว่าเป็นของวันนี้)
export const todayTransactions = (data) => {
  const today = todayLabel();
  return data.transactions.filter((t) => (t.dateLabel || today) === today);
};

