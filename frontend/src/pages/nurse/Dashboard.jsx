import React, { useState, useEffect } from 'react';
import axios from 'axios';

const getLocalDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Dashboard = ({ user }) => {
  // เก็บตัวเลขสรุปสำหรับแสดงในการ์ด
  const [stats, setStats] = useState({
    todayBookings: 0,
    todayHomeVisits: 0,
    // pendingLeaves: 0, // คอมเมนต์เก็บไว้ก่อน เนื่องจาก Dashboard ใช้ร่วมกับ nurse ที่ไม่ต้องเห็นรายการรอจัดการใบลา
    totalPatients: 0
  });

  // เก็บรายการนัดหมาย 3 อันแรก สำหรับแสดงเป็น Timeline
  const [upcomingBookings, setUpcomingBookings] = useState([]);

  // สถานะการโหลดข้อมูล
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // หาวันที่ปัจจุบันตามเวลาเครื่อง (YYYY-MM-DD)
      const today = getLocalDateString();

      // ยิง API หลักพร้อมกันเพื่อความรวดเร็ว (ใช้ Promise.all)
      const [bookingsRes, visitsRes, patientsRes] = await Promise.all([
        axios.get(`http://localhost:5001/api/bookings?date=${today}`),
        axios.get(`http://localhost:5002/api/home-visits`),
        axios.get(`http://localhost:5004/api/patients`)
      ]);

      // นับจำนวนคิวนัดหมายวันนี้ (ไม่นับรายการที่ถูกยกเลิก)
      const bookingsList = bookingsRes.data.success ? bookingsRes.data.data : [];
      const activeBookingsList = bookingsList.filter(b => b.status !== 'cancelled');
      const todayBookingsCount = activeBookingsList.length;

      // นับจำนวนทริปเยี่ยมบ้านวันนี้
      let todayVisitsCount = 0;
      if (visitsRes.data.success) {
        todayVisitsCount = visitsRes.data.data.filter(v => String(v.visit_date).slice(0, 10) === today).length;
      }

      /*
      // นับจำนวนใบลาที่รอดำเนินการ (pending) ของทุกคนในระบบ (คอมเมนต์เก็บไว้ก่อน)
      let pendingLeavesCount = 0;
      try {
        const pendingRes = await axios.get('http://localhost:5003/api/leaves/pending/all');
        if (pendingRes.data.success && Array.isArray(pendingRes.data.data)) {
          pendingLeavesCount = pendingRes.data.data.length;
        }
      } catch (leaveErr) {
        console.warn('ดึงใบลารออนุมัติทั้งหมดไม่สำเร็จ ลองดึงเฉพาะผู้ใช้ปัจจุบันแทน:', leaveErr);
        const currentUserId = user?.id || 2;
        const userLeavesRes = await axios.get(`http://localhost:5003/api/leaves/${currentUserId}`);
        if (userLeavesRes.data.success && Array.isArray(userLeavesRes.data.data)) {
          pendingLeavesCount = userLeavesRes.data.data.filter(l => l.status === 'pending').length;
        }
      }
      */

      // นับจำนวนคนไข้ทั้งหมด
      const totalPatientsCount = patientsRes.data.success ? patientsRes.data.data.length : 0;

      // อัปเดตตัวเลขลง State
      setStats({
        todayBookings: todayBookingsCount,
        todayHomeVisits: todayVisitsCount,
        // pendingLeaves: pendingLeavesCount,
        totalPatients: totalPatientsCount
      });

      // เอาแค่ 3 อันแรกมาโชว์ใน Timeline
      setUpcomingBookings(activeBookingsList.slice(0, 3));

    } catch (error) {
      console.error("ดึงข้อมูล Dashboard ไม่สำเร็จ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // โหลดข้อมูลทันทีที่เข้าหน้า
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ถ้ายังโหลดไม่เสร็จ ให้แสดงตัวหมุนๆ
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[#00c0e8]">
        <i className="bi bi-arrow-repeat animate-spin text-4xl"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* แบนเนอร์ต้อนรับด้านบน */}
      <div className="bg-[#00c0e8] rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-[#00c0e8]/30">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold mb-2 drop-shadow-md">
            "ดูแลใจ...ไปด้วยกัน"
          </h1>
          <p className="text-white text-lg font-medium drop-shadow">
            เพราะทุกความรู้สึกควรได้รับการดูแล
          </p>
        </div>
        <i className="bi bi-heart-fill absolute right-10 top-1/2 -translate-y-1/2 text-8xl text-white/20 pointer-events-none"></i>
      </div>

      {/* การ์ดสรุปตัวเลขแบบสมดุล (3 คอลัมน์บนหน้าจอใหญ่) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* การ์ดที่ 1: นัดหมายวันนี้ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#00c0e8]/15 hover:border-[#00c0e8]/40 hover:shadow-md transition-all flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-[#00c0e8]/10 flex items-center justify-center shrink-0">
              <i className="bi bi-calendar-check text-2xl text-[#00c0e8]"></i>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm font-medium truncate">คิวนัดหมายวันนี้</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{stats.todayBookings}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-[#009ec2] bg-[#00c0e8]/10 px-2.5 py-1 rounded-full shrink-0">
            วันนี้
          </span>
        </div>

        {/* การ์ดที่ 2: เยี่ยมบ้านวันนี้ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <i className="bi bi-house-heart text-2xl text-emerald-500"></i>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm font-medium truncate">เยี่ยมบ้านวันนี้</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{stats.todayHomeVisits}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
            วันนี้
          </span>
        </div>

        {/* การ์ดที่ 3 (เดิม): รายการรอจัดการ (ใบลา) — คอมเมนต์เก็บไว้ก่อน */}
        {/*
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
              <i className="bi bi-hourglass-split text-2xl text-amber-500"></i>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm font-medium truncate">รายการรอจัดการ</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{stats.pendingLeaves}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full shrink-0">
            รออนุมัติ
          </span>
        </div>
        */}

        {/* การ์ดที่ 4 (เดิม): ผู้ป่วยทั้งหมด */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
              <i className="bi bi-people text-2xl text-purple-500"></i>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm font-medium truncate">ผู้ป่วยทั้งหมด</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{stats.totalPatients}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full shrink-0">
            ในระบบ
          </span>
        </div>

      </div>

      {/* ส่วนแสดงรายการนัดหมายที่กำลังจะมาถึง */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <i className="bi bi-clock-history text-[#00c0e8]"></i>
            รายการนัดหมายที่กำลังจะมาถึง
          </h2>
          <a href="/nurse/booking" className="text-sm text-[#00c0e8] hover:text-[#009ec2] hover:underline font-semibold">
            ดูทั้งหมด
          </a>
        </div>

        <div className="p-6">
          {upcomingBookings.length === 0 ? (
            // ถ้าไม่มีนัดหมายเลย
            <div className="text-center text-gray-400 py-8">
              <i className="bi bi-calendar-x text-4xl mb-2 block"></i>
              <p className="text-sm">ไม่มีรายการนัดหมายในวันนี้</p>
            </div>
          ) : (
            // ถ้ามีนัดหมาย ให้วนลูปแสดงเป็น Timeline
            <div className="space-y-5">
              {upcomingBookings.map((booking, index) => (
                <div key={booking.id} className="flex gap-4 relative items-stretch">

                  {/* เส้น Timeline (จะไม่แสดงเส้นในอันสุดท้าย) */}
                  {index !== upcomingBookings.length - 1 && (
                    <div className="absolute left-11 top-9 -bottom-5 w-0.5 bg-[#00c0e8]/15"></div>
                  )}

                  {/* แสดงเวลาเริ่ม - สิ้นสุด */}
                  <div className="w-24 shrink-0 pt-3 flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00c0e8] mt-1.5 shrink-0 ring-4 ring-[#00c0e8]/15"></span>
                    <p className="text-sm font-bold text-[#009ec2] leading-snug">
                      {booking.start_time.substring(11, 16)} - {booking.end_time.substring(11, 16)}
                    </p>
                  </div>

                  {/* กล่องข้อมูลนัดหมาย */}
                  <div className="flex-1 bg-ivory rounded-2xl p-4 border border-gray-100 hover:border-[#00c0e8]/30 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <i className="bi bi-person text-gray-500 text-lg"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          นัดหมายกับ {booking.patient_first_name} {booking.patient_last_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          HN: {booking.hn} | หมอ: {booking.doctor_first_name} {booking.doctor_last_name}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-[#00c0e8]/10 text-[#009ec2] px-3 py-1 rounded-full font-semibold shrink-0">
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;