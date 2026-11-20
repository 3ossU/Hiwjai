import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { PageHeader, Card } from '../admin/AdminUI';
import { inputCls, btn } from '../admin/adminStyles';
import { fmt2, round2, consultTotal, serviceTotal, pharmacyTotal, grandTotal } from './cashierData';

export const StatusTag = ({ status }) =>
  status === 'ready' ? (
    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">พร้อมชำระ</span>
  ) : (
    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{status}</span>
  );

const TypeTag = ({ type }) => (
  <span
    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
      type === 'ฝ่ายยา' ? 'bg-emerald-50 text-emerald-700' : type === 'บริการ' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'
    }`}
  >
    {type}
  </span>
);

const Billing = () => {
  const { data, selectedHn, setSelectedHn, showToast } = useOutletContext();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const filtered = data.patients.filter((p) => !query || p.name.toLowerCase().includes(query) || p.hn.includes(query));
  const p = data.patients.find((x) => x.hn === selectedHn) || null;
  const ready = p?.status === 'ready';

  const goPayment = () => {
    if (!p) return showToast('กรุณาเลือกรายการผู้รับบริการก่อน', 'error');
    if (!ready) return showToast(`รายการนี้ยังไม่พร้อมชำระเงิน — ${p.status}`, 'error');
    navigate('/cashier/payment');
  };

  return (
    <>
      <PageHeader
        icon="bi-receipt"
        title="คำนวณและดึงข้อมูลค่าบริการ"
        subtitle="รับข้อมูลค่าบริการการแพทย์และรายการยาจากระบบเพื่อสรุปยอดชำระ (Pending Billing)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* รายการรอชำระ */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sky-700">รายการรอชำระเงิน</h3>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-600">{data.patients.length} คิว</span>
          </div>

          <div className="relative mb-4">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-sky-400"></i>
            <input
              className={`${inputCls} pl-10`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อผู้รับบริการ / HN..."
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2.5 pr-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {data.patients.length ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการรอชำระเงิน'}
              </p>
            ) : (
              filtered.map((x) => (
                <button
                  key={x.hn}
                  onClick={() => setSelectedHn(x.hn)}
                  className={`w-full text-left flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                    x.hn === selectedHn ? 'bg-sky-50 border-sky-300' : 'bg-slate-50/60 border-transparent hover:bg-sky-50 hover:border-sky-200'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm truncate">
                      {x.name} <span className="text-slate-400 font-normal">(HN {x.hn})</span>
                    </span>
                    <span className="block text-xs text-slate-500 truncate">{x.doctor}</span>
                  </span>
                  <StatusTag status={x.status} />
                </button>
              ))
            )}
          </div>
        </Card>

        {/* รายละเอียดค่าบริการ */}
        <Card className="p-6 flex flex-col">
          <h3 className="font-bold text-sky-700 mb-4">รายละเอียดค่าบริการ</h3>

          {!p ? (
            <p className="py-8 text-center text-sm text-slate-400 flex-1">กรุณาเลือกรายการผู้รับบริการ</p>
          ) : (
            <div className="flex-1">
              <p className="text-sm text-slate-500 mb-2">
                {p.name} (HN {p.hn}) • {p.doctor}
              </p>

              <div className="max-h-56 overflow-auto rounded-2xl border border-sky-50">
                <table className="w-full text-sm min-w-[420px]">
                  <thead className="sticky top-0 bg-sky-50 text-sky-700">
                    <tr>
                      <th className="text-left font-semibold px-3 py-2.5">แผนก/รายการ</th>
                      <th className="text-left font-semibold px-3 py-2.5">ประเภท</th>
                      <th className="text-center font-semibold px-3 py-2.5">จำนวน</th>
                      <th className="text-right font-semibold px-3 py-2.5">ราคา (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.items.map((i, idx) => (
                      <tr key={idx} className="border-t border-sky-50">
                        <td className="px-3 py-2.5">{i.name}</td>
                        <td className="px-3 py-2.5"><TypeTag type={i.type} /></td>
                        <td className="px-3 py-2.5 text-center">{i.qty}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt2(i.qty * i.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 p-4 rounded-2xl bg-sky-50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>รวมค่าบริการการแพทย์</span>
                  <span className="tabular-nums">{fmt2(round2(consultTotal(p.items) + serviceTotal(p.items)))} ฿</span>
                </div>
                <div className="flex justify-between">
                  <span>รวมค่ายาและเวชภัณฑ์</span>
                  <span className="tabular-nums">{fmt2(pharmacyTotal(p.items))} ฿</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t-2 border-dashed border-sky-200 text-lg font-bold text-sky-700">
                  <span>ยอดรวมสุทธิ</span>
                  <span className="tabular-nums">{fmt2(grandTotal(p.items))} ฿</span>
                </div>
              </div>

              {!ready && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  รายการนี้ยังไม่พร้อมชำระเงิน — สถานะ: {p.status}
                </div>
              )}
            </div>
          )}

          <button
            onClick={goPayment}
            disabled={!p || !ready}
            title={p && !ready ? `รายการนี้ยังไม่พร้อมชำระเงิน (${p.status})` : ''}
            className={`${btn.primary} justify-center w-full mt-5 py-3.5`}
          >
            ดำเนินการชำระเงิน <i className="bi bi-arrow-right"></i>
          </button>
        </Card>
      </div>
    </>
  );
};

export default Billing;
