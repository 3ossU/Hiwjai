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

// ใบเสร็จ: tx = รายการที่ชำระแล้ว, ถ้าไม่มี tx จะแสดงตัวอย่างจาก patient
const Receipt = ({ tx, patient }) => {
  const src = tx || patient;
  if (!src) return <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีรายการชำระเงินในรอบนี้</p>;

  return (
    <div id="cashier-receipt" className="bg-white p-5 rounded-xl shadow-sm text-[13px] leading-relaxed text-slate-700">
      <div className="text-center mb-3">
        <p className="text-base font-bold text-sky-600">คลินิกสุขภาพจิต HiwJai</p>
        {tx ? <p>ใบเสร็จรับเงิน / Receipt</p> : <p className="text-xs text-amber-500">*** ตัวอย่าง — ยังไม่ชำระเงิน ***</p>}
      </div>
      <Dash />
      <p>วันที่: {tx?.dateLabel || todayLabel()}{tx && ` ${tx.time} | เลขที่: ${tx.receiptNo}`}</p>
      <p>HN: {src.hn} | ชื่อ: {src.name}</p>
      <Dash />
      <Row label="ค่าปรึกษาแพทย์" value={fmt2(consultTotal(src.items))} />
      <Row label="ค่ายาและเวชภัณฑ์" value={fmt2(pharmacyTotal(src.items))} />
      <Row label="ค่าบริการ" value={fmt2(serviceTotal(src.items))} />
      <Dash />
      <Row label="ยอดรวมทั้งสิ้น" value={`${fmt2(tx ? tx.amount : grandTotal(src.items))} ฿`} className="font-bold" />
      {tx && (
        <>
          <Row label={`ชำระด้วย: ${tx.method}`} value={`รับมา ${fmt2(tx.received)}`} className="text-slate-500" />
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

// ตรวจข้อมูลของแต่ละช่องทาง — คืนข้อความ error หรือ null
const validate = (method, { change, pp, card }) => {
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

// ฟอร์มรับเงินของผู้ป่วย 1 คน (ใช้ key=hn ให้รีเซ็ตเองเมื่อเปลี่ยนคน)
const PaymentForm = ({ patient, onPay, onError, busy }) => {
  const total = patient ? grandTotal(patient.items) : 0;
  const [method, setMethod] = useState(CASH);
  const [cash, setCash] = useState(() => (patient ? fmtMoney(total) : '0'));
  const [pp, setPp] = useState({ ref: '', verified: false });
  const [card, setCard] = useState({ brand: CARD_BRANDS[0], last4: '', approval: '' });

  const ready = patient?.status === 'ready';
  const change = round2(parseMoney(cash) - total);
  const error = validate(method, { change, pp, card });

  const onCashChange = (e) => {
    let v = e.target.value.replace(/[^0-9.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`;
    setCash(v);
  };

  const submit = () => {
    if (busy || !patient || !ready) return;
    if (error) return onError(error);
    const detail =
      method === PROMPTPAY ? { ref: pp.ref }
      : method === CARD ? { brand: card.brand, last4: card.last4, approval: card.approval }
      : null;
    onPay({ method, received: method === CASH ? parseMoney(cash) : total, detail });
  };

  return (
    <>
      <h3 className="font-bold text-sky-700">เลือกช่องทางการชำระเงิน</h3>
      <p className="text-sm text-slate-500 mt-1">ผู้ป่วย: {patient ? `${patient.name} (HN ${patient.hn})` : '-'}</p>
      <p className="text-4xl font-bold text-sky-800 my-4 tabular-nums">{fmt2(total)} ฿</p>

      {!patient ? (
        <p className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-400 text-center">ไม่มีรายการที่เลือก — กลับไปเลือกผู้รับบริการที่หน้าคำนวณค่าบริการ</p>
      ) : (
        <>
          {!ready && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i> รายการนี้ยังไม่พร้อมชำระเงิน — สถานะ: {patient.status}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`p-4 rounded-2xl border-2 text-center transition cursor-pointer ${
                  method === m.key ? 'border-sky-400 bg-sky-50 text-sky-700 font-semibold' : 'border-slate-200 hover:border-sky-200'
                }`}
              >
                <i className={`bi ${m.icon} block text-2xl text-sky-600 mb-1`}></i>
                {m.key}
              </button>
            ))}
          </div>

          {method === CASH && (
            <>
              <label className="block mt-5 text-sm text-slate-500">
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
          {method === PROMPTPAY && <PromptPayPanel total={total} value={pp} onChange={setPp} />}
          {method === CARD && <CardPanel total={total} value={card} onChange={setCard} />}
        </>
      )}

      <button
        onClick={submit}
        disabled={!patient || !ready || busy || !!error}
        title={error || ''}
        className="w-full mt-6 py-4 rounded-2xl bg-sky-600 text-white text-lg font-semibold hover:bg-sky-700 transition cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        <i className="bi bi-printer"></i> บันทึก & ออกใบเสร็จ
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

  const patient = data.patients.find((x) => x.hn === selectedHn) || null;

  const pay = async ({ method, received, detail }) => {
    if (!patient) return showToast('ไม่พบข้อมูลผู้รับบริการ', 'error');
    if (patient.status !== 'ready') return showToast('รายการนี้ยังไม่พร้อมชำระเงิน', 'error');

    const total = grandTotal(patient.items);
    const change = round2(received - total);
    if (change < 0) return showToast('จำนวนเงินที่รับมาไม่เพียงพอ', 'error');

    const draft = { method, detail };
    const extra =
      method === CASH ? `\nรับมา ${fmt2(received)} ฿ · เงินทอน ${fmt2(change)} ฿`
      : `\n${methodDetailText(draft)}`;

    setBusy(true);
    const ok = await askConfirm({
      title: 'ยืนยันการชำระเงิน',
      message: `ยืนยันการชำระเงิน ${fmt2(total)} ฿ ผ่าน ${method} ?${extra}`,
      okText: 'ยืนยันชำระเงิน',
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
      showToast(
        method === CASH
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
    if (!data.patients.length) showToast('ไม่มีรายการรอชำระเงินแล้ว', 'error');
  };

  return (
    <>
      <style>{PRINT_CSS}</style>
      <PageHeader icon="bi-cash-coin" title="ชำระเงิน" subtitle="เลือกช่องทางชำระเงินและบันทึกรายการออกใบเสร็จ (Payment Processing)" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          {paidTx ? (
            <>
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
                <i className="bi bi-check-circle-fill"></i> ชำระเงินเรียบร้อยแล้ว — เลขที่ {paidTx.receiptNo}
              </div>
              <h3 className="font-bold text-sky-700">ผู้ป่วย: {paidTx.name} (HN {paidTx.hn})</h3>
              <p className="text-4xl font-bold text-sky-800 my-4 tabular-nums">{fmt2(paidTx.amount)} ฿</p>
              <p className="text-sm text-slate-500">
                ชำระด้วย {paidTx.method}
                {paidTx.method === CASH
                  ? ` · รับมา ${fmt2(paidTx.received)} ฿ · เงินทอน ${fmt2(paidTx.change)} ฿`
                  : ` · ${methodDetailText(paidTx)}`}
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
          <Receipt tx={paidTx} patient={patient} />
        </Card>
      </div>
    </>
  );
};

export default Payment;