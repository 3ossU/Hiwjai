// ส่ง SMS ผ่านผู้ให้บริการที่ตั้งใน .env (SMS_PROVIDER = console | twilio | thaibulksms)
// console = แค่พิมพ์ OTP ใน terminal ใช้ตอนพัฒนา ไม่ส่ง SMS จริง

const provider = () => (process.env.SMS_PROVIDER || 'console').toLowerCase();

// โหมดทดสอบ: ให้ API ส่ง OTP กลับไปแสดงในหน้าเว็บได้ (เฉพาะ console และไม่ใช่ production)
export const isDevConsole = () =>
  provider() === 'console' && process.env.NODE_ENV !== 'production';

// 0812345678 -> +66812345678
const toE164TH = (phone) => '+66' + String(phone).replace(/^0/, '');

export async function sendSms(phone, message) {
  const p = provider();

  if (p === 'console') {
    console.log(`[SMS:console] to ${phone}: ${message}`);
    return;
  }

  if (p === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error('ตั้งค่า Twilio ใน .env ไม่ครบ');

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toE164TH(phone), From: from, Body: message }),
    });
    if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
    return;
  }

  if (p === 'thaibulksms') {
    const key = process.env.THAIBULKSMS_API_KEY;
    const secret = process.env.THAIBULKSMS_API_SECRET;
    if (!key || !secret) throw new Error('ตั้งค่า ThaiBulkSMS ใน .env ไม่ครบ');

    const res = await fetch('https://api-v2.thaibulksms.com/sms', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        msisdn: phone,
        message,
        sender: process.env.THAIBULKSMS_SENDER || 'Hiwjai',
      }),
    });
    if (!res.ok) throw new Error(`ThaiBulkSMS error ${res.status}: ${await res.text()}`);
    return;
  }

  throw new Error(`ไม่รู้จัก SMS_PROVIDER: ${p}`);
}