import { Link } from 'react-router-dom'

const menu = [
  { to: '/patient/booking', icon: '📅', title: 'จองนัดหมาย', desc: 'เลือกผู้ให้คำปรึกษาและเวลาที่สะดวก' },
  { to: '/patient/records', icon: '🩺', title: 'ประวัติการรักษา', desc: 'ดูผลการตรวจและยาที่ได้รับ' },
  { to: '/patient/homevisit', icon: '🏠', title: 'เยี่ยมบ้าน', desc: 'ดูตารางเยี่ยมบ้านของคุณ' },
  { to: '/patient/activities', icon: '', title: 'กิจกรรมโรงพยาบาล', desc: 'ลงทะเบียนเข้าร่วมกิจกรรม' },
]

export default function Home({ user }) {
  return (
    <>
      <h1 className="pt-title">สวัสดี คุณ {user?.name || ''} ♡</h1>
      <p style={{ textAlign: 'center', marginTop: -12, color: '#5b6b72' }}>
        ดูแลใจ...ไปด้วยกัน {user?.hn ? `· HN: ${user.hn}` : ''}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
          marginTop: 24,
        }}
      >
        {menu.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="pt-card"
            style={{ textDecoration: 'none', color: 'inherit', marginTop: 0 }}
          >
            <div style={{ fontSize: 32 }}>{m.icon}</div>
            <h3 style={{ margin: '8px 0 4px' }}>{m.title}</h3>
            <div style={{ fontSize: 13, color: '#5b6b72' }}>{m.desc}</div>
          </Link>
        ))}
      </div>
    </>
  )
}