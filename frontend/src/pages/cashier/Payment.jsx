import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader, Card } from '../admin/AdminUI';
import { btn, inputCls } from '../admin/adminStyles';
import {
  METHODS, CASH, PROMPTPAY, CARD, CARD_BRANDS, PROMPTPAY_ACCOUNT, isTestPromptPay,
  promptPayPayload, methodDetailText, pickNextHn,
  fmt2, fmtMoney, parseMoney, round2, todayLabel,
  consultTotal, pharmacyTotal, serviceTotal, grandTotal,
} from './cashierData';
import { cashierApi } from './cashierApi';

// ประเภทสิทธิ์การรักษา
const COVERAGES = [
  { key: 'ชำระเงินเอง', label: 'ชำระเงินเอง', icon: 'bi-person-check', desc: 'ชำระเต็มจำนวน' },
  { key: 'บัตรทอง', label: 'สิทธิ์บัตรทอง', icon: 'bi-card-heading', desc: 'สปสช. / 30 บาท' },
  { key: 'ประกัน', label: 'ประกันสุขภาพ/สังคม', icon: 'bi-shield-check', desc: 'เคลมบริษัทประกัน' },
  { key: 'เบิกเงินได้', label: 'เบิกจ่ายตรง/ต้นสังกัด', icon: 'bi-building-check', desc: 'ข้าราชการ/รัฐวิสาหกิจ' },
];

// ตอนพิมพ์ ให้เห็นเฉพาะใบเสร็จ
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #cashier-receipt, #cashier-receipt * { visibility: visible !important; }
  #cashier-receipt { position: fixed; left: 0; top: 0; width: 100%; box-shadow: none !important; }
}`;

const Row = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-3 ${className}`}>
    <span>{label}</span>
    <span className="tabular-nums text-right">{value}</span>
  </div>
);

const Dash = () => <hr className="my-2.5 border-0 border-t border-dashed border-slate-300" />;

// ใบเสร็จ: tx = รายการที่ชำระแล้ว, ถ้าไม่มี tx จะแสดงตัวอย่างจาก patient + previewCoverage
const Receipt = ({ tx, patient, previewCoverage }) => {
  const src = tx || patient;
  if (!src) return <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีรายการชำระเงินในรอบนี้</p>;

  const rawTotal = grandTotal(src.items);
  const cov = tx ? tx.detail?.coverage : previewCoverage;
  const coveredAmount = cov && cov.type !== 'ชำระเงินเอง' ? round2(cov.coveredAmount || 0) : 0;
  const netTotal = tx ? tx.amount : round2(Math.max(0, rawTotal - coveredAmount));

  return (
    <div id="cashier-receipt" className="bg-white p-5 rounded-xl shadow-sm text-[13px] leading-relaxed text-slate-700">
      <div className="text-center mb-3">
        <p className="text-base font-bold text-sky-600">คลินิกสุขภาพจิต HiwJai</p>
        {tx ? <p>ใบเสร็จรับเงิน / ใบรับรองการใช้สิทธิ์</p> : <p className="text-xs text-amber-500">*** ตัวอย่าง — ยังไม่ชำระเงิน ***</p>}
      </div>
      <Dash />
      <p>วันที่: {tx?.dateLabel || todayLabel()}{tx && ` ${tx.time} | เลขที่: ${tx.receiptNo}`}</p>
      <p>HN: {src.hn} | ชื่อ: {src.name}</p>
      {cov && cov.type !== 'ชำระเงินเอง' && (
        <p className="font-semibold text-sky-700">
          สิทธิ์การรักษา: {cov.type} {cov.provider ? `(${cov.provider})` : ''} {cov.refNo ? `· เลขที่ ${cov.refNo}` : ''}
        </p>
      )}
      <Dash />
      <Row label="ค่าปรึกษาแพทย์" value={fmt2(consultTotal(src.items))} />
      <Row label="ค่ายาและเวชภัณฑ์" value={fmt2(pharmacyTotal(src.items))} />
      <Row label="ค่าบริการ" value={fmt2(serviceTotal(src.items))} />
      <Dash />
      <Row label="รวมค่ารักษาพยาบาล" value={`${fmt2(rawTotal)} ฿`} />
      {coveredAmount > 0 && (
        <Row label={`หักสิทธิ์ (${cov.type})`} value={`-${fmt2(coveredAmount)} ฿`} className="text-emerald-600 font-medium" />
      )}
      <Row label="ยอดสุทธิที่ผู้ป่วยชำระ" value={`${fmt2(netTotal)} ฿`} className="font-bold text-sm mt-1" />
      {tx && (
        <>
          <Row label={`ช่องทาง: ${tx.method}`} value={`รับมา ${fmt2(tx.received)}`} className="text-slate-500" />
          {methodDetailText(tx) && <p className="text-slate-500">{methodDetailText(tx)}</p>}
          {tx.method === CASH && <Row label="เงินทอน" value={fmt2(tx.change)} className="text-slate-500" />}
        </>
      )}
    </div>
  );
};

/* ---------- PromptPay ---------- */
const PromptPayPanel = ({ total, value, onChange }) => (
  <div className="mt-5 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-start">
    <div className="mx-auto sm:mx-0 w-52 rounded-2xl border border-sky-100 bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2 bg-sky-700 text-white text-center text-xs font-semibold tracking-wide">
        <i className="bi bi-qr-code-scan"></i> สแกนจ่ายด้วยพร้อมเพย์
      </div>
      <div className="p-3 flex flex-col items-center">
        <QRCodeSVG value={promptPayPayload(PROMPTPAY_ACCOUNT.id, total)} size={176} level="M" marginSize={1} />
        <p className="mt-2 text-lg font-bold text-sky-700 tabular-nums">{fmt2(total)} ฿</p>
        <p className="text-[11px] text-slate-500 text-center leading-tight">{PROMPTPAY_ACCOUNT.name}</p>
      </div>
      {isTestPromptPay && (
        <p className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] text-center">QR ทดสอบ — ยังไม่ได้ตั้งค่า PromptPay ID</p>
      )}
    </div>

    <div className="space-y-3">
      <ol className="text-sm text-slate-500 list-decimal pl-5 space-y-0.5">
        <li>ให้ผู้รับบริการสแกน QR ด้วยแอปธนาคาร</li>
        <li>ตรวจสลิป: ชื่อผู้รับ และยอด {fmt2(total)} ฿ ต้องตรงกัน</li>
        <li>กรอกเลขอ้างอิงจากสลิป แล้วยืนยันว่ายอดเงินเข้าแล้ว</li>
      </ol>

      <label className="block text-sm text-slate-600 font-semibold">
        เลขอ้างอิงธุรกรรม (จากสลิป) <span className="text-rose-400">*</span>
        <input
          className={`${inputCls} mt-1 font-mono uppercase`}
          value={value.ref}
          maxLength={30}
          onChange={(e) => onChange({ ...value, ref: e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase() })}
          placeholder="เช่น 016330145812ABC12345"
        />
      </label>

      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50 text-sm text-sky-800 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-sky-600"
          checked={value.verified}
          onChange={(e) => onChange({ ...value, verified: e.target.checked })}
        />
        ตรวจสอบแล้วว่ายอดเงิน {fmt2(total)} ฿ เข้าบัญชีคลินิกเรียบร้อย
      </label>
    </div>
  </div>
);

/* ---------- บัตรเครดิต ---------- */
const CardPanel = ({ total, value, onChange }) => (
  <div className="mt-5 space-y-4">
    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-800 text-sm flex items-start gap-2">
      <i className="bi bi-credit-card-2-front mt-0.5"></i>
      <span>รูด/แตะบัตรที่เครื่อง EDC ยอด <b className="tabular-nums">{fmt2(total)} ฿</b> แล้วกรอกข้อมูลจากสลิปเครื่อง EDC</span>
    </div>

    <div>
      <span className="block text-sm font-semibold text-slate-600 mb-1.5">ประเภทบัตร</span>
      <div className="flex flex-wrap gap-2">
        {CARD_BRANDS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange({ ...value, brand: b })}
            className={`px-3.5 py-2 rounded-xl border-2 text-sm font-semibold transition cursor-pointer ${
              value.brand === b ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-200'
            }`}
          >
            {b}
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="block text-sm text-slate-600 font-semibold">
        เลขบัตร 4 หลักท้าย <span className="text-rose-400">*</span>
        <div className="relative mt-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono tracking-widest">••••</span>
          <input
            className={`${inputCls} pl-16 font-mono tracking-widest`}
            value={value.last4}
            maxLength={4}
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => onChange({ ...value, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="1234"
          />
        </div>
      </label>
      <label className="block text-sm text-slate-600 font-semibold">
        รหัสอนุมัติ (Approval Code) <span className="text-rose-400">*</span>
        <input
          className={`${inputCls} mt-1 font-mono uppercase tracking-widest`}
          value={value.approval}
          maxLength={6}
          autoComplete="off"
          onChange={(e) => onChange({ ...value, approval: e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6) })}
          placeholder="6 หลัก"
        />
      </label>
    </div>
    <p className="text-xs text-slate-400"><i className="bi bi-shield-lock"></i> ห้ามบันทึกเลขบัตรเต็ม วันหมดอายุ หรือ CVV ลงในระบบ</p>
  </div>
);

// ตรวจข้อมูลสิทธิ์ + ช่องทางชำระเงิน
const validate = ({ covType, covRefNo, coveredAmount, rawTotal, netTotal, method, change, pp, card }) => {
  if (covType !== 'ชำระเงินเอง') {
    if (!covRefNo.trim()) return `กรุณากรอกเลขที่อ้างอิง / เลขบัตรประชาชน / เลขกรมธรรม์ สำหรับสิทธิ์${covType}`;
    if (coveredAmount <= 0) return 'ยอดที่ใช้สิทธิ์เบิก/คุ้มครองต้องมากกว่า 0 บาท';
    if (coveredAmount > rawTotal) return 'ยอดใช้สิทธิ์ต้องไม่เกินยอดค่ารักษารวม';
  }

  // ถ้ายอดสุทธิเป็น 0 บาท (เบิกได้เต็มจำนวน) ไม่ต้องตรวจช่องทางชำระเงินเพิ่ม
  if (netTotal <= 0) return null;

  if (method === CASH) return change < 0 ? 'จำนวนเงินที่รับมาไม่เพียงพอ' : null;
  if (method === PROMPTPAY) {
    if (pp.ref.length < 6) return 'กรุณากรอกเลขอ้างอิงธุรกรรมจากสลิป (อย่างน้อย 6 ตัว)';
    if (!pp.verified) return 'กรุณายืนยันว่าตรวจสอบยอดเงินเข้าแล้ว';
    return null;
  }
  if (method === CARD) {
    if (!/^\d{4}$/.test(card.last4)) return 'กรุณากรอกเลขบัตร 4 หลักท้าย';
    if (!/^[0-9A-Z]{6}$/.test(card.approval)) return 'กรุณากรอกรหัสอนุมัติ 6 หลักจากสลิป EDC';
    return null;
  }
  return 'ช่องทางชำระเงินไม่ถูกต้อง';
};

// ฟอร์มรับเงินของผู้ป่วย 1 คน
const PaymentForm = ({ patient, onPay, onError, busy, onCoverageChange }) => {
  const rawTotal = patient ? grandTotal(patient.items) : 0;

  // State สิทธิ์การรักษา
  const [covType, setCovType] = useState('ชำระเงินเอง');
  const [covProvider, setCovProvider] = useState('');
  const [covRefNo, setCovRefNo] = useState('');
  const [coveredInput, setCoveredInput] = useState('0');

  // State ช่องทางชำระเงินส่วนต่าง
  const [method, setMethod] = useState(CASH);
  const [cash, setCash] = useState(() => (patient ? fmtMoney(rawTotal) : '0'));
  const [pp, setPp] = useState({ ref: '', verified: false });
  const [card, setCard] = useState({ brand: CARD_BRANDS[0], last4: '', approval: '' });

  const coveredAmount = covType === 'ชำระเงินเอง' ? 0 : round2(Math.min(rawTotal, Math.max(0, parseMoney(coveredInput))));
  const netTotal = round2(Math.max(0, rawTotal - coveredAmount));

  const ready = patient?.status === 'ready';
  const change = round2(parseMoney(cash) - netTotal);
  const error = validate({ covType, covRefNo, coveredAmount, rawTotal, netTotal, method, change, pp, card });

  const notifyPreview = (nextType, nextProvider, nextRefNo, nextCovered) => {
    onCoverageChange?.({
      type: nextType,
      provider: nextProvider,
      refNo: nextRefNo,
      coveredAmount: nextType === 'ชำระเงินเอง' ? 0 : nextCovered,
    });
  };

  const selectCoverage = (nextType) => {
    setCovType(nextType);
    let defaultCov = 0;
    if (nextType === 'บัตรทอง' || nextType === 'เบิกเงินได้' || nextType === 'ประกัน') {
      defaultCov = rawTotal; // ค่าเริ่มต้นคุ้มครองเต็มจำนวน (แก้เป็นร่วมจ่าย 30 บาท หรือกรอกเองได้)
    }
    setCoveredInput(fmtMoney(defaultCov));
    const nextNet = round2(Math.max(0, rawTotal - defaultCov));
    setCash(fmtMoney(nextNet));
    notifyPreview(nextType, covProvider, covRefNo, defaultCov);
  };

  const handleCoveredChange = (valStr) => {
    let v = valStr.replace(/[^0-9.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`;
    setCoveredInput(v);
    const num = round2(Math.min(rawTotal, Math.max(0, parseMoney(v))));
    const nextNet = round2(Math.max(0, rawTotal - num));
    setCash(fmtMoney(nextNet));
    notifyPreview(covType, covProvider, covRefNo, num);
  };

  const applyGoldCard30 = () => {
    const cov30 = round2(Math.max(0, rawTotal - 30));
    setCoveredInput(fmtMoney(cov30));
    setCash('30');
    notifyPreview(covType, covProvider, covRefNo, cov30);
  };

  const applyFullCoverage = () => {
    setCoveredInput(fmtMoney(rawTotal));
    setCash('0');
    notifyPreview(covType, covProvider, covRefNo, rawTotal);
  };

  const onCashChange = (e) => {
    let v = e.target.value.replace(/[^0-9.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`;
    setCash(v);
  };

  const submit = () => {
    if (busy || !patient || !ready) return;
    if (error) return onError(error);

    const coverageInfo =
      covType === 'ชำระเงินเอง'
        ? null
        : {
            type: covType,
            provider: covProvider.trim() || null,
            refNo: covRefNo.trim(),
            coveredAmount,
            originalTotal: rawTotal,
          };

    const payMethod = netTotal === 0 ? `สิทธิ์${covType}` : method;
    const detail = {
      ...(method === PROMPTPAY && netTotal > 0 ? { ref: pp.ref } : {}),
      ...(method === CARD && netTotal > 0 ? { brand: card.brand, last4: card.last4, approval: card.approval } : {}),
      ...(coverageInfo ? { coverage: coverageInfo } : {}),
    };

    onPay({
      method: payMethod,
      received: netTotal === 0 ? 0 : method === CASH ? parseMoney(cash) : netTotal,
      coveredAmount,
      detail: Object.keys(detail).length > 0 ? detail : null,
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-bold text-sky-700">เลือกสิทธิ์การรักษาและช่องทางชำระเงิน</h3>
          <p className="text-sm text-slate-500 mt-0.5">ผู้ป่วย: {patient ? `${patient.name} (HN ${patient.hn})` : '-'}</p>
        </div>
        {coveredAmount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ยอดเต็ม {fmt2(rawTotal)} ฿ · หักสิทธิ์ -{fmt2(coveredAmount)} ฿
          </span>
        )}
      </div>

      {/* แสดงยอดสุทธิที่ต้องชำระจริง */}
      <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">ยอดสุทธิที่ผู้ป่วยต้องชำระ</p>
          <p className="text-3xl sm:text-4xl font-bold text-sky-800 mt-0.5 tabular-nums">{fmt2(netTotal)} ฿</p>
        </div>
        {covType !== 'ชำระเงินเอง' && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-500 text-white">
              <i className="bi bi-check2-circle"></i> {covType}
            </span>
          </div>
        )}
      </div>

      {!patient ? (
        <p className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-400 text-center">ไม่มีรายการที่เลือก — กลับไปเลือกผู้รับบริการที่หน้าคำนวณค่าบริการ</p>
      ) : (
        <>
          {!ready && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i> รายการนี้ยังไม่พร้อมชำระเงิน — สถานะ: {patient.status}
            </div>
          )}

          {/* ส่วนที่ 1: เลือกสิทธิ์การรักษา */}
          <div className="mb-5">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. สิทธิ์การรักษา / การเบิกจ่าย</span>
            <div className="grid grid-cols-2 gap-2.5">
              {COVERAGES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => selectCoverage(c.key)}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
                    covType === c.key
                      ? 'border-emerald-400 bg-emerald-50/70 text-emerald-800'
                      : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-sky-200'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${covType === c.key ? 'bg-emerald-500 text-white' : 'bg-white text-sky-500'}`}>
                    <i className={`bi ${c.icon} text-lg`}></i>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{c.label}</p>
                    <p className="text-[11px] opacity-75 truncate">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* ฟอร์มกรอกรายละเอียดสิทธิ์ (แสดงเมื่อไม่ได้เลือก "ชำระเงินเอง") */}
            {covType !== 'ชำระเงินเอง' && (
              <div className="mt-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-slate-600">
                    {covType === 'ประกัน' ? 'บริษัทประกัน / ประเภทประกัน' : covType === 'เบิกเงินได้' ? 'หน่วยงานต้นสังกัด' : 'หน่วยบริการ / ประเภทสิทธิ์'}
                    <input
                      className={`${inputCls} mt-1 bg-white`}
                      value={covProvider}
                      onChange={(e) => {
                        setCovProvider(e.target.value);
                        notifyPreview(covType, e.target.value, covRefNo, coveredAmount);
                      }}
                      placeholder={covType === 'ประกัน' ? 'เช่น AIA, ประกันสังคม' : covType === 'เบิกเงินได้' ? 'เช่น กรมบัญชีกลาง' : 'เช่น สปสช. บัตรทอง'}
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-600">
                    เลขบัตรประชาชน / เลขกรมธรรม์ / เลขที่อนุมัติ <span className="text-rose-400">*</span>
                    <input
                      className={`${inputCls} mt-1 bg-white font-mono`}
                      value={covRefNo}
                      onChange={(e) => {
                        setCovRefNo(e.target.value);
                        notifyPreview(covType, covProvider, e.target.value, coveredAmount);
                      }}
                      placeholder="เช่น 1100400XXXXXX"
                    />
                  </label>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-600">ยอดที่สิทธิ์คุ้มครอง / เบิกได้ (บาท)</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={applyFullCoverage}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 cursor-pointer"
                      >
                        คุ้มครองเต็มจำนวน ({fmtMoney(rawTotal)} ฿)
                      </button>
                      {covType === 'บัตรทอง' && rawTotal > 30 && (
                        <button
                          type="button"
                          onClick={applyGoldCard30}
                          className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-50 cursor-pointer"
                        >
                          ร่วมจ่าย 30 บาท
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    value={coveredInput}
                    onChange={(e) => handleCoveredChange(e.target.value)}
                    inputMode="decimal"
                    className={`${inputCls} bg-white text-right font-bold text-emerald-700 tabular-nums`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ส่วนที่ 2: เลือกช่องทางชำระส่วนต่าง (แสดงเฉพาะเมื่อมียอดต้องชำระ > 0 บาท) */}
          {netTotal > 0 ? (
            <div>
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                2. ช่องทางการชำระเงิน {coveredAmount > 0 ? `(ส่วนต่าง ${fmt2(netTotal)} ฿)` : ''}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {METHODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={`p-3.5 rounded-2xl border-2 text-center transition cursor-pointer ${
                      method === m.key ? 'border-sky-400 bg-sky-50 text-sky-700 font-semibold' : 'border-slate-200 hover:border-sky-200'
                    }`}
                  >
                    <i className={`bi ${m.icon} block text-xl text-sky-600 mb-1`}></i>
                    <span className="text-sm">{m.key}</span>
                  </button>
                ))}
              </div>

              {method === CASH && (
                <>
                  <label className="block mt-4 text-sm text-slate-500">
                    รับเงินมา (บาท)
                    <input
                      value={cash}
                      onChange={onCashChange}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => setCash((v) => (parseMoney(v) ? fmtMoney(parseMoney(v)) : '0'))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        if (!e.repeat) submit();
                      }}
                      inputMode="decimal"
                      autoComplete="off"
                      className="mt-1.5 w-full px-3 py-2.5 text-3xl font-bold text-right text-sky-700 border-2 border-sky-200 rounded-2xl outline-none focus:border-sky-400 tabular-nums"
                    />
                  </label>
                  <div
                    className={`mt-4 p-4 rounded-2xl border flex justify-between items-center text-lg font-bold ${
                      change < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <span>เงินทอน:</span>
                    <span className="tabular-nums">{change < 0 ? 'ไม่เพียงพอ' : `${fmt2(change)} ฿`}</span>
                  </div>
                </>
              )}
              {method === PROMPTPAY && <PromptPayPanel total={netTotal} value={pp} onChange={setPp} />}
              {method === CARD && <CardPanel total={netTotal} value={card} onChange={setCard} />}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
              <i className="bi bi-check-circle-fill text-lg text-emerald-600"></i>
              <span>ใช้สิทธิ์ <b>{covType}</b> ครอบคลุมค่าใช้จ่ายเต็มจำนวน <b>0.00 ฿</b> (ไม่ต้องเก็บเงินเพิ่ม)</span>
            </div>
          )}
        </>
      )}

      <button
        onClick={submit}
        disabled={!patient || !ready || busy || !!error}
        title={error || ''}
        className="w-full mt-6 py-4 rounded-2xl bg-sky-600 text-white text-lg font-semibold hover:bg-sky-700 transition cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        <i className="bi bi-printer"></i> {netTotal === 0 ? 'บันทึกการใช้สิทธิ์ & ออกใบเสร็จ' : 'บันทึก & ออกใบเสร็จ'}
      </button>
      {patient && ready && error && <p className="mt-2 text-xs text-center text-slate-400">{error}</p>}
    </>
  );
};

const Payment = () => {
  const { data, setData, selectedHn, setSelectedHn, showToast, askConfirm } = useOutletContext();
  const navigate = useNavigate();
  const [paidTx, setPaidTx] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewCoverage, setPreviewCoverage] = useState({ type: 'ชำระเงินเอง', coveredAmount: 0 });

  const patient = data.patients.find((x) => x.hn === selectedHn) || null;

  const pay = async ({ method, received, coveredAmount = 0, detail }) => {
    if (!patient) return showToast('ไม่พบข้อมูลผู้รับบริการ', 'error');
    if (patient.status !== 'ready') return showToast('รายการนี้ยังไม่พร้อมชำระเงิน', 'error');

    const rawTotal = grandTotal(patient.items);
    const netTotal = round2(Math.max(0, rawTotal - coveredAmount));
    const change = round2(received - netTotal);
    if (netTotal > 0 && change < 0) return showToast('จำนวนเงินที่รับมาไม่เพียงพอ', 'error');

    const covInfo = detail?.coverage;
    const covLine = covInfo ? `\nใช้สิทธิ์: ${covInfo.type} (หักสิทธิ์ ${fmt2(covInfo.coveredAmount)} ฿)` : '';
    const extra =
      netTotal === 0
        ? `${covLine}\nยอดชำระสุทธิ 0.00 ฿`
        : method === CASH
        ? `${covLine}\nชำระสุทธิ ${fmt2(netTotal)} ฿ · รับมา ${fmt2(received)} ฿ · เงินทอน ${fmt2(change)} ฿`
        : `${covLine}\nชำระสุทธิ ${fmt2(netTotal)} ฿ ผ่าน ${method}`;

    setBusy(true);
    const ok = await askConfirm({
      title: netTotal === 0 ? 'ยืนยันการใช้สิทธิ์การรักษา' : 'ยืนยันการชำระเงิน',
      message: `ยืนยันการทำรายการของ ${patient.name} ?${extra}`,
      okText: 'ยืนยัน',
    });
    if (!ok) {
      setBusy(false);
      return;
    }

    try {
      const res = await cashierApi.submitPayment({
        invoiceId: patient.invoiceId,
        method,
        received,
        coveredAmount,
        detail,
      });

      const tx = res.transaction;
      const remaining = data.patients.filter((x) => x.hn !== patient.hn);

      setData((prev) => ({
        ...prev,
        transactions: [tx, ...prev.transactions],
        patients: prev.patients.filter((x) => x.hn !== tx.hn),
      }));
      setSelectedHn(pickNextHn(remaining));
      setPaidTx(tx);
      setPreviewCoverage({ type: 'ชำระเงินเอง', coveredAmount: 0 });
      showToast(
        netTotal === 0
          ? `บันทึกการใช้สิทธิ์เรียบร้อย — เลขที่ ${tx.receiptNo}`
          : method === CASH
          ? `ชำระเงินเรียบร้อย — เลขที่ ${tx.receiptNo} | เงินทอน ${fmt2(tx.change)} ฿`
          : `ชำระเงินเรียบร้อย — เลขที่ ${tx.receiptNo} | ${method}`
      );
    } catch (err) {
      showToast(err.message || 'บันทึกการชำระเงินไม่สำเร็จ', 'error');
    } finally {
      setBusy(false);
    }
  };

  const nextPayment = () => {
    setPaidTx(null);
    setPreviewCoverage({ type: 'ชำระเงินเอง', coveredAmount: 0 });
    if (!data.patients.length) showToast('ไม่มีรายการรอชำระเงินแล้ว', 'error');
  };

  return (
    <>
      <style>{PRINT_CSS}</style>
      <PageHeader icon="bi-cash-coin" title="ชำระเงินและตรวจสอบสิทธิ์" subtitle="เลือกสิทธิ์การรักษา ช่องทางชำระเงิน และบันทึกรายการออกใบเสร็จ" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          {paidTx ? (
            <>
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
                <i className="bi bi-check-circle-fill"></i> บันทึกรายการเรียบร้อยแล้ว — เลขที่ {paidTx.receiptNo}
              </div>
              <h3 className="font-bold text-sky-700">ผู้ป่วย: {paidTx.name} (HN {paidTx.hn})</h3>
              <p className="text-4xl font-bold text-sky-800 my-4 tabular-nums">{fmt2(paidTx.amount)} ฿</p>
              <p className="text-sm text-slate-500">
                ช่องทาง: {paidTx.method}
                {paidTx.detail?.coverage && ` · หักสิทธิ์ ${paidTx.detail.coverage.type} ${fmt2(paidTx.detail.coverage.coveredAmount)} ฿`}
                {paidTx.method === CASH && ` · รับมา ${fmt2(paidTx.received)} ฿ · เงินทอน ${fmt2(paidTx.change)} ฿`}
              </p>

              <div className="mt-6 space-y-2">
                <button onClick={nextPayment} className={`${btn.primary} justify-center w-full py-3.5`}>
                  ชำระรายถัดไป <i className="bi bi-arrow-right"></i>
                </button>
                <button onClick={() => navigate('/cashier/finance')} className={`${btn.ghost} justify-center w-full py-3.5`}>
                  <i className="bi bi-graph-up-arrow"></i> ไปหน้าสรุปการเงิน
                </button>
              </div>
            </>
          ) : (
            <PaymentForm
              key={patient?.hn ?? 'none'}
              patient={patient}
              onPay={pay}
              onError={(m) => showToast(m, 'error')}
              busy={busy}
              onCoverageChange={setPreviewCoverage}
            />
          )}
        </Card>

        <Card className="p-6 !bg-slate-50 !border-dashed !border-slate-300 self-start">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">{paidTx ? 'ใบเสร็จรับเงิน' : 'ตัวอย่างใบเสร็จ (Receipt Preview)'}</h3>
            <button
              onClick={() => window.print()}
              disabled={!paidTx && !patient}
              className="px-3.5 py-2 rounded-xl bg-white border border-sky-200 text-sky-600 text-sm hover:bg-sky-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="bi bi-printer"></i> พิมพ์
            </button>
          </div>
          <Receipt tx={paidTx} patient={patient} previewCoverage={previewCoverage} />
        </Card>
      </div>
    </>
  );
};

export default Payment;