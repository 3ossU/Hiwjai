import { useOutletContext } from 'react-router-dom';
import { PageHeader, Card } from '../admin/AdminUI';
import { fmt2, round2, todayLabel, todayTransactions, methodDetailText } from './cashierData';
import { cashierApi } from './cashierApi';

const StatCard = ({ label, value, icon, cls }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <h4 className="text-sm text-slate-500">{label}</h4>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}>
        <i className={`bi ${icon}`}></i>
      </span>
    </div>
    <p className="mt-2 text-2xl font-bold text-slate-800 tabular-nums">{fmt2(value)} ฿</p>
  </Card>
);

const Finance = () => {
  const { data, setData, showToast, askConfirm } = useOutletContext();

  const todayTx = todayTransactions(data);
  const unsent = todayTx.filter((t) => !t.sent);

  const sum = (rows) => round2(rows.reduce((s, t) => s + t.amount, 0));
  const byMethod = (m) => sum(unsent.filter((t) => t.method === m));
  const total = sum(unsent);

  const sendToFinance = async () => {
    if (!unsent.length) return showToast('ยังไม่มีรายการให้ส่งยอด', 'error');

    const ok = await askConfirm({
      title: 'สรุปและส่งยอด',
      message: `ยืนยันการสรุปและส่งยอดรวม ${fmt2(total)} ฿ ให้แผนกการเงิน?\n(จะทำการปิดกะเคาน์เตอร์)`,
      okText: 'ส่งยอด',
    });
    if (!ok) return;

    try {
      const res = await cashierApi.closeShift();
      const ids = new Set(unsent.map((t) => t.receiptNo));
      setData((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          ids.has(t.receiptNo) ? { ...t, sent: true, sentAt: res.sentAt } : t
        ),
      }));
      showToast(`ส่งยอด ${fmt2(total)} ฿ เรียบร้อย — ปิดกะเคาน์เตอร์แล้ว`);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถนำส่งยอดได้', 'error');
    }
  };

  return (
    <>
      <PageHeader
        icon="bi-graph-up-arrow"
        title="สรุปรายรับและนำส่งยอด"
        subtitle={`ประจำวันที่: ${todayLabel()} | รอบวัน (Shift 1) · Financial Summary`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="ยอดรอนำส่งทั้งหมด" value={total} icon="bi-wallet2" cls="bg-sky-50 text-sky-600" />
        <StatCard label="เงินสด (Cash)" value={byMethod('เงินสด')} icon="bi-cash-stack" cls="bg-emerald-50 text-emerald-600" />
        <StatCard label="PromptPay / โอน" value={byMethod('PromptPay')} icon="bi-qr-code" cls="bg-cyan-50 text-cyan-600" />
        <StatCard label="บัตรเครดิต" value={byMethod('บัตรเครดิต')} icon="bi-credit-card" cls="bg-indigo-50 text-indigo-600" />
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-sky-700">รายการรับชำระประจำวัน ({todayTx.length} รายการ)</h3>

        <div className="mt-3 max-h-80 overflow-auto rounded-2xl border border-sky-50">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="sticky top-0 bg-sky-50 text-sky-700">
              <tr>
                {['เวลา', 'เลขที่ใบเสร็จ', 'ชื่อผู้รับบริการ', 'ช่องทาง'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5">{h}</th>
                ))}
                <th className="text-right font-semibold px-3 py-2.5">จำนวนเงิน</th>
                <th className="text-left font-semibold px-3 py-2.5">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {todayTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">ยังไม่มีรายการรับชำระ</td>
                </tr>
              ) : (
                todayTx.map((t) => (
                  <tr key={t.receiptNo} className="border-t border-sky-50">
                    <td className="px-3 py-2.5 tabular-nums">{t.time}</td>
                    <td className="px-3 py-2.5">{t.receiptNo}</td>
                    <td className="px-3 py-2.5">{t.name}</td>
                    <td className="px-3 py-2.5">
                      {t.method}
                      {methodDetailText(t) && <span className="block text-xs text-slate-400 font-mono">{methodDetailText(t)}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt2(t.amount)} ฿</td>
                    <td className="px-3 py-2.5">
                      {t.sent ? (
                        <span className="text-slate-400">ส่งแล้ว {t.sentAt && `(${t.sentAt})`}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">สำเร็จ</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-5 rounded-2xl bg-sky-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-sky-800">พร้อมนำส่งยอดเข้าแผนกการเงินหรือยัง?</p>
            <p className="text-xs text-slate-500">การส่งยอดจะทำการปิดกะประจำวันของเคาน์เตอร์นี้</p>
          </div>
          <button
            onClick={sendToFinance}
            disabled={!unsent.length}
            className="px-6 py-3 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition cursor-pointer whitespace-nowrap disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <i className="bi bi-send"></i> สรุปและส่งยอดให้การเงิน
          </button>
        </div>
      </Card>
    </>
  );
};

export default Finance;