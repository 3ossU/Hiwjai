import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import { authenticateCashier } from './authMiddleware.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('กรุณาตั้ง JWT_SECRET ใน .env (ต้องตรงกับ auth-service)');
}

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

async function generateReceiptNo(conn) {
  const now = new Date();
  const yy = String(now.getFullYear() + 543).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `REC-${yy}${mm}-`;

  const [rows] = await conn.query(
    'SELECT receipt_no FROM payment_transactions WHERE receipt_no LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const lastSeq = parseInt(rows[0].receipt_no.split('-')[2], 10);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'cashier-service', port: PORT });
});

app.use('/api/cashier', authenticateCashier);

app.get('/api/cashier/pending-bills', async (_req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT 
        bi.id AS invoice_id, bi.status, bi.total_amount, bi.created_at,
        pi.id AS patient_id, pi.hn,
        CONCAT('คุณ ', pu.first_name, ' ', pu.last_name) AS name,
        CONCAT('แพทย์: ', du.first_name, ' ', du.last_name) AS doctor
      FROM billing_invoices bi
      JOIN patient_info pi ON bi.patient_id = pi.id
      JOIN users pu ON pi.user_id = pu.id
      JOIN users du ON bi.doctor_id = du.id
      WHERE bi.status != 'paid'
      ORDER BY bi.created_at ASC
    `);

    if (invoices.length === 0) return res.json([]);

    const invoiceIds = invoices.map((inv) => inv.invoice_id);
    const [items] = await db.query(
      'SELECT invoice_id, item_name AS name, item_type AS type, qty, unit_price AS price FROM billing_invoice_items WHERE invoice_id IN (?)',
      [invoiceIds]
    );

    const result = invoices.map((inv) => ({
      invoiceId: inv.invoice_id,
      patientId: inv.patient_id,
      hn: inv.hn,
      name: inv.name,
      doctor: inv.doctor,
      status: inv.status,
      items: items
        .filter((item) => item.invoice_id === inv.invoice_id)
        .map((item) => ({
          name: item.name,
          type: item.type,
          qty: Number(item.qty),
          price: Number(item.price),
        })),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการรอชำระเงินได้' });
  }
});

app.post('/api/cashier/payments', async (req, res) => {
  const { invoiceId, method, received, detail = null } = req.body;
  const cashierId = req.user.id || req.user.userId || req.user.sub;

  if (!invoiceId || !method || received === undefined) {
    return res.status(400).json({ message: 'ข้อมูลการชำระเงินไม่ครบถ้วน' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [invRows] = await conn.query(
      `SELECT bi.*, pi.hn, CONCAT('คุณ ', u.first_name, ' ', u.last_name) AS patient_name
       FROM billing_invoices bi
       JOIN patient_info pi ON bi.patient_id = pi.id
       JOIN users u ON pi.user_id = u.id
       WHERE bi.id = ? FOR UPDATE`,
      [invoiceId]
    );

    if (invRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบบิลค่าบริการนี้ในระบบ' });
    }

    const invoice = invRows[0];
    if (invoice.status === 'paid') {
      await conn.rollback();
      return res.status(409).json({ message: 'บิลนี้ถูกชำระเงินเรียบร้อยแล้ว' });
    }
    if (invoice.status !== 'ready') {
      await conn.rollback();
      return res.status(400).json({ message: `บิลนี้ยังไม่พร้อมชำระเงิน (สถานะ: ${invoice.status})` });
    }

    const [itemRows] = await conn.query(
      'SELECT item_name AS name, item_type AS type, qty, unit_price AS price FROM billing_invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );
    const totalAmount = Math.round(itemRows.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0) * 100) / 100;
    const receivedNum = Number(received);
    const changeAmount = Math.round((receivedNum - totalAmount) * 100) / 100;

    if (changeAmount < 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'จำนวนเงินที่รับมาไม่เพียงพอ' });
    }

    const receiptNo = await generateReceiptNo(conn);

    await conn.query(
      `INSERT INTO payment_transactions 
       (receipt_no, invoice_id, patient_id, cashier_id, payment_method, amount, received_amount, change_amount, payment_detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptNo, invoiceId, invoice.patient_id, cashierId, method,
        totalAmount, receivedNum, method === 'เงินสด' ? changeAmount : 0,
        detail ? JSON.stringify(detail) : null,
      ]
    );

    await conn.query("UPDATE billing_invoices SET status = 'paid' WHERE id = ?", [invoiceId]);
    await conn.commit();

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    res.status(201).json({
      message: 'ชำระเงินและออกใบเสร็จเรียบร้อย',
      transaction: {
        receiptNo,
        time: timeStr,
        name: invoice.patient_name,
        hn: invoice.hn,
        method,
        detail,
        amount: totalAmount,
        received: receivedNum,
        change: method === 'เงินสด' ? changeAmount : 0,
        sent: false,
        items: itemRows.map((i) => ({ name: i.name, type: i.type, qty: Number(i.qty), price: Number(i.price) })),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน' });
  } finally {
    conn.release();
  }
});

app.get('/api/cashier/transactions/today', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        pt.id, pt.receipt_no AS receiptNo, DATE_FORMAT(pt.paid_at, '%H:%i') AS time,
        CONCAT('คุณ ', u.first_name, ' ', u.last_name) AS name, pi.hn,
        pt.payment_method AS method, pt.payment_detail AS detail,
        pt.amount, pt.received_amount AS received, pt.change_amount AS \`change\`,
        pt.is_sent_to_finance AS sent, DATE_FORMAT(pt.sent_at, '%H:%i') AS sentAt
      FROM payment_transactions pt
      JOIN patient_info pi ON pt.patient_id = pi.id
      JOIN users u ON pi.user_id = u.id
      WHERE DATE(pt.paid_at) = CURDATE()
      ORDER BY pt.paid_at DESC
    `);

    res.json(
      rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        received: Number(r.received),
        change: Number(r.change),
        sent: Boolean(r.sent),
        detail: typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลสรุปรายรับประจำวันได้' });
  }
});

app.post('/api/cashier/finance/close-shift', async (_req, res) => {
  try {
    const [result] = await db.query(`
      UPDATE payment_transactions
      SET is_sent_to_finance = 1, sent_at = NOW()
      WHERE DATE(paid_at) = CURDATE() AND is_sent_to_finance = 0
    `);

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการใหม่ที่รอนำส่งยอดในวันนี้' });
    }

    const now = new Date();
    const sentAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    res.json({ message: `นำส่งยอดเรียบร้อยจำนวน ${result.affectedRows} รายการ`, updatedCount: result.affectedRows, sentAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการปิดกะส่งยอด' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Cashier Service running at http://localhost:${PORT}`);
});