import { Link } from 'react-router-dom'
import './Home.css'

const I = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  />
)

const CalendarIcon = () => (
  <I>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="M12 13.2c-1.3-1.2-3-.2-3 1.2 0 1.5 3 3.3 3 3.3s3-1.8 3-3.3c0-1.4-1.7-2.4-3-1.2z" fill="currentColor" stroke="none" />
  </I>
)

const RecordIcon = () => (
  <I>
    <path d="M7 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
    <path d="M15 3.5V8h4" />
    <path d="M8.5 14h1.8l1.2-2.6 1.6 5 1.2-2.4h1.7" />
  </I>
)

const HomeVisitIcon = () => (
  <I>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5" />
    <path d="M12 17.2s-3-1.8-3-3.6c0-1.2 1.5-2 3-.7 1.5-1.3 3-.5 3 .7 0 1.8-3 3.6-3 3.6z" />
  </I>
)

const ActivityIcon = () => (
  <I>
    <circle cx="9" cy="8" r="2.8" />
    <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="17.2" cy="9.5" r="2.2" />
    <path d="M16.5 14.2c2.4 0 4 1.6 4 4.3" />
  </I>
)

const ChatIcon = () => (
  <I>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z" />
    <path d="M8.5 9.5h7M8.5 12.5h4" />
  </I>
)

const ArrowIcon = () => (
  <I>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </I>
)

const Heart = ({ className }) => (
  <svg className={'hm-heart ' + className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 4.8 6.2 4.8c2 0 3.8 1.1 4.8 2.7l1 1.5 1-1.5c1-1.6 2.8-2.7 4.8-2.7 3.4 0 5.3 3.6 3.8 7C19.5 16.4 12 21 12 21z" />
  </svg>
)

const main = {
  to: '/patient/booking',
  Icon: CalendarIcon,
  title: 'จองนัดหมาย',
  desc: 'เลือกผู้ให้คำปรึกษาและเวลาที่สะดวก พบกันได้ทั้งที่คลินิก ออนไลน์ หรือที่บ้าน',
}

const menu = [
  { to: '/patient/records', Icon: RecordIcon, title: 'ประวัติการรักษา', desc: 'ดูผลการตรวจและยาที่ได้รับ' },
  { to: '/patient/homevisit', Icon: HomeVisitIcon, title: 'เยี่ยมบ้าน', desc: 'ดูตารางเยี่ยมบ้านของคุณ' },
  { to: '/patient/activities', Icon: ActivityIcon, title: 'กิจกรรมโรงพยาบาล', desc: 'ลงทะเบียนเข้าร่วมกิจกรรม' },
  { to: '/patient/chat', Icon: ChatIcon, title: 'แชท', desc: 'พูดคุยกับทีมดูแลของคุณ' },
]

export default function Home({ user }) {
  return (
    <div className="hm">
      {/* hero */}
      <section className="hm-hero">
        <Heart className="h1" />
        <Heart className="h2" />
        <Heart className="h3" />
        <div className="hm-ring r1" />
        <div className="hm-ring r2" />

        <div className="hm-hero-body">
          <span className="hm-chip">HealthConnect</span>
          <h1>สวัสดี คุณ {user?.name || ''}</h1>
          <p>ดูแลใจ...ไปด้วยกัน</p>
          {user?.hn && <span className="hm-hn">HN {user.hn}</span>}
        </div>
      </section>

      {/* เมนูหลัก */}
      <Link to={main.to} className="hm-main">
        <div className="hm-main-icon">
          <main.Icon />
        </div>
        <div className="hm-main-text">
          <h3>{main.title}</h3>
          <p>{main.desc}</p>
        </div>
        <span className="hm-main-go">
          เริ่มจอง <ArrowIcon />
        </span>
      </Link>

      {/* เมนูรอง */}
      <div className="hm-grid">
        {menu.map(({ to, Icon, title, desc }) => (
          <Link key={to} to={to} className="hm-card">
            <div className="hm-icon">
              <Icon />
            </div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <span className="hm-arrow">
              <ArrowIcon />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}