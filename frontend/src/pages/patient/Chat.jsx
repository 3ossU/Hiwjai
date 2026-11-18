export default function Chat({ user }) {
  return (
    <>
      <h1 className="pt-title">แชท</h1>
      <div className="pt-card pt-empty">
        สวัสดี คุณ {user?.name || ''} ระบบแชทกำลังอยู่ระหว่างพัฒนา
      </div>
    </>
  )
}