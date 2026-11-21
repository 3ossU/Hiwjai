// ใส่ Basic ID ของ LINE Official Account ของโรงพยาบาล (ขึ้นต้นด้วย @)
// ตั้งในไฟล์ frontend/.env ได้: VITE_LINE_OA_ID=@hiwjai
export const LINE_OA_ID = import.meta.env.VITE_LINE_OA_ID || '@yourlineid'
export const LINE_OA_NAME = 'Hiwjai ฮีลใจ'

// ลิงก์เพิ่มเพื่อน (เปิดแอป LINE บนมือถือ / เปิดหน้าเว็บ LINE บนคอม)
export const lineAddUrl = `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_ID)}`

// ลิงก์เปิดห้องแชทพร้อมข้อความที่เตรียมไว้ให้
export const lineMessageUrl = (text) =>
  `https://line.me/R/oaMessage/${encodeURIComponent(LINE_OA_ID)}/?${encodeURIComponent(text)}`

export const isPlaceholderId = LINE_OA_ID === '@yourlineid'