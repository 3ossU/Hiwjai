// ข้อมูลและฟังก์ชันคำนวณของหน้าแคชเชียร์
// ตอนนี้ยังไม่มี backend ฝั่งการเงิน จึงใช้ข้อมูลทดสอบเก็บใน localStorage ไปก่อน

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
export const clone = (o) => JSON.parse(JSON.stringify(o));

export const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
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

export const nextReceiptNo = (seq) => {
  const d = new Date();
  const yy = String(d.getFullYear() + 543).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `REC-${yy}${mm}-${String(seq).padStart(3, '0')}`;
};

/* ---------- ข้อมูลทดสอบ ---------- */
export const STORAGE_KEY = 'hiwjai_cashier_state_v2';
const STATE_VERSION = 2;

export const DEFAULT_STATE = {
  version: STATE_VERSION,
  patients: [
    {
      hn: '660412', name: 'คุณ สมชาย ใจดี',
      doctor: 'จิตแพทย์: พญ.ใจดี มีสุข', status: 'ready',
      items: [
        { name: 'ค่าปรึกษาจิตแพทย์ (45 นาที)', type: 'แพทย์', qty: 1, price: 1500 },
        { name: 'Sertraline 50 mg (30 เม็ด)', type: 'ฝ่ายยา', qty: 1, price: 450 },
        { name: 'Lorazepam 0.5 mg (10 เม็ด)', type: 'ฝ่ายยา', qty: 1, price: 150 },
        { name: 'ค่าบริการโรงพยาบาล/คลินิก', type: 'บริการ', qty: 1, price: 200 },
      ],
    },
    {
      hn: '660415', name: 'คุณ สุภาพร ปรึกษาดี',
      doctor: 'นักจิตวิทยา: นพ.รักสงบ', status: 'รอฝ่ายยา',
      items: [
        { name: 'ค่าปรึกษานักจิตวิทยา (50 นาที)', type: 'แพทย์', qty: 1, price: 1200 },
        { name: 'Fluoxetine 20 mg (30 เม็ด)', type: 'ฝ่ายยา', qty: 1, price: 380 },
      ],
    },
    {
      hn: '660420', name: 'คุณ วิภา สุขใจ',
      doctor: 'จิตแพทย์: นพ.สงบ ใจเย็น', status: 'ready',
      items: [
        { name: 'ค่าปรึกษาจิตแพทย์ (30 นาที)', type: 'แพทย์', qty: 1, price: 1000 },
        { name: 'ค่าบริการโรงพยาบาล/คลินิก', type: 'บริการ', qty: 1, price: 200 },
      ],
    },
  ],
  transactions: [
    {
      time: '13:10', receiptNo: 'REC-6610-086', name: 'คุณ นภา ใส', hn: '660398', method: 'บัตรเครดิต', amount: 2100, received: 2100, change: 0,
      items: [
        { name: 'ค่าปรึกษาจิตแพทย์ (45 นาที)', type: 'แพทย์', qty: 1, price: 1500 },
        { name: 'Sertraline 50 mg (30 เม็ด)', type: 'ฝ่ายยา', qty: 1, price: 400 },
        { name: 'ค่าบริการโรงพยาบาล/คลินิก', type: 'บริการ', qty: 1, price: 200 },
      ],
    },
    {
      time: '13:40', receiptNo: 'REC-6610-087', name: 'คุณ ปรีชา มั่นคง', hn: '660401', method: 'เงินสด', amount: 800, received: 1000, change: 200,
      items: [{ name: 'ค่าปรึกษาจิตแพทย์ (30 นาที)', type: 'แพทย์', qty: 1, price: 800 }],
    },
    {
      time: '14:05', receiptNo: 'REC-6610-088', name: 'คุณ กนกวรรณ ร่าเริง', hn: '660410', method: 'PromptPay', amount: 1500, received: 1500, change: 0,
      items: [
        { name: 'ค่าปรึกษานักจิตวิทยา (50 นาที)', type: 'แพทย์', qty: 1, price: 1200 },
        { name: 'Fluoxetine 20 mg (30 เม็ด)', type: 'ฝ่ายยา', qty: 1, price: 300 },
      ],
    },
  ],
  receiptSeq: 88,
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const valid =
        s?.version === STATE_VERSION &&
        Array.isArray(s.patients) &&
        Array.isArray(s.transactions) &&
        Number.isFinite(s.receiptSeq);
      if (valid) return s;
    }
  } catch {
    /* ข้อมูลเสีย/อ่านไม่ได้ ใช้ค่าเริ่มต้น */
  }
  return clone(DEFAULT_STATE);
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ไม่มี localStorage ก็แค่ไม่จำ */
  }
}
