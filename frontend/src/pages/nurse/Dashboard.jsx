import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ user }) => {
  // เก็บตัวเลขสรุปสำหรับแสดงในการ์ดทั้ง 4 ใบ
  const [stats, setStats] = useState({
    todayBookings: 0,
    todayHomeVisits: 0,
    pendingLeaves: 0,
    totalPatients: 0
  });

  // เก็บรายการนัดหมาย 3 อันแรก สำหรับแสดงเป็น Timeline
  const [upcomingBookings, setUpcomingBookings] = useState([]);

  // สถานะการโหลดข้อมูล
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // หาวันที่ปัจจุบันในรูปแบบ YYYY-MM-DD (เพื่อเอาไว้กรองนัดหมายวันนี้)
      const today = new Date().toISOString().split('T')[0];
      // ดึง ID ของพยาบาลที่ล็อกอินอยู่ (ถ้าไม่มีให้ใช้ ID 2 ไปก่อน)
      const currentUserId = user?.id || 2;

      // ยิง API ทั้ง 4 ตัวพร้อมกันเพื่อความรวดเร็ว (ใช้ Promise.all)
      const [bookingsRes, visitsRes, leavesRes, patientsRes] = await Promise.all([
        axios.get(`http://localhost:5001/api/bookings?date=${today}`),
        axios.get(`http://localhost:5002/api/home-visits`),
        axios.get(`http://localhost:5003/api/leaves/${currentUserId}`),
        axios.get(`http://localhost:5004/api/patients`)
      ]);

      // นับจำนวนคิวนัดหมายวันนี้
      const todayBookingsCount = bookingsRes.data.success ? bookingsRes.data.data.length : 0;
      // เก็บรายการนัดหมายไว้โชว์ Timeline
      const bookingsList = bookingsRes.data.success ? bookingsRes.data.data : [];

      // นับจำนวนทริปเยี่ยมบ้านวันนี้
      let todayVisitsCount = 0;
      if (visitsRes.data.success) {
        todayVisitsCount = visitsRes.data.data.filter(v => v.visit_date === today).length;
      }

      // นับจำนวนใบลาที่รอดำเนินการ (pending)
      let pendingLeavesCount = 0;
      if (leavesRes.data.success) {
        pendingLeavesCount = leavesRes.data.data.filter(l => l.status === 'pending').length;
      }

      // นับจำนวนคนไข้ทั้งหมด
      const totalPatientsCount = patientsRes.data.success ? patientsRes.data.data.length : 0;

      // อัปเดตตัวเลขลง State
      setStats({
        todayBookings: todayBookingsCount,
        todayHomeVisits: todayVisitsCount,
        pendingLeaves: pendingLeavesCount,
        totalPatients: totalPatientsCount
      });

      // เอาแค่ 3 อันแรกมาโชว์ใน Timeline
      setUpcomingBookings(bookingsList.slice(0, 3));

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
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 drop-shadow-md">
            "ดูแลใจ...ไปด้วยกัน"
          </h1>
          <p className="text-white text-lg font-medium drop-shadow">
            เพราะทุกความรู้สึกควรได้รับการดูแล
          </p>
        </div>
        <i className="bi bi-heart-fill absolute right-10 top-1/2 -translate-y-1/2 text-8xl text-white/20"></i>
      </div>

      {/* การ์ดสรุปตัวเลข 4 ใบ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* การ์ดที่ 1: นัดหมายวันนี้ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#00c0e8]/10 flex items-center justify-center shrink-0">
            <i className="bi bi-calendar-check text-2xl text-[#00c0e8]"></i>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">คิวนัดหมายวันนี้</p>
            <p className="text-2xl font-bold text-black">{stats.todayBookings}</p>
          </div>
        </div>

        {/* การ์ดที่ 2: เยี่ยมบ้านวันนี้ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <i className="bi bi-house-heart text-2xl text-green-500"></i>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">เยี่ยมบ้านวันนี้</p>
            <p className="text-2xl font-bold text-black">{stats.todayHomeVisits}</p>
          </div>
        </div>

        {/* การ์ดที่ 3: รายการรอจัดการ (ใบลา) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
            <i className="bi bi-hourglass-split text-2xl text-yellow-500"></i>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">รายการรอจัดการ</p>
            <p className="text-2xl font-bold text-black">{stats.pendingLeaves}</p>
          </div>
        </div>

        {/* การ์ดที่ 4: ผู้ป่วยทั้งหมด */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
            <i className="bi bi-people text-2xl text-purple-500"></i>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">ผู้ป่วยทั้งหมด</p>
            <p className="text-2xl font-bold text-black">{stats.totalPatients}</p>
          </div>
        </div>

      </div>

      {/* ส่วนแสดงรายการนัดหมายที่กำลังจะมาถึง */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <i className="bi bi-clock-history text-[#00c0e8]"></i>
            รายการนัดหมายที่กำลังจะมาถึง
          </h2>
          <a href="/nurse/booking" className="text-sm text-[#00c0e8] hover:underline font-medium">ดูทั้งหมด</a>
        </div>

        <div className="p-6">
          {upcomingBookings.length === 0 ? (
            // ถ้าไม่มีนัดหมายเลย
            <div className="text-center text-gray-400 py-6">
              <i className="bi bi-calendar-x text-4xl mb-2"></i>
              <p>ไม่มีรายการนัดหมายในวันนี้</p>
            </div>
          ) : (
            // ถ้ามีนัดหมาย ให้วนลูปแสดงเป็น Timeline
            <div className="space-y-6">
              {upcomingBookings.map((booking, index) => (
                <div key={booking.id} className="flex gap-4 relative">

                  {/* เส้น Timeline (จะไม่แสดงเส้นในอันสุดท้าย) */}
                  {index !== upcomingBookings.length - 1 && (
                    <div className="absolute left-6 -bottom-6 top-12 w-0.5 bg-gray-100"></div>
                  )}

                  {/* แสดงเวลาเริ่ม - สิ้นสุด */}
                  <div className="w-24 shrink-0 pt-1">
                    <p className="text-sm font-bold text-[#00c0e8]">
                      {booking.start_time.substring(11, 16)} - {booking.end_time.substring(11, 16)}
                    </p>
                  </div>

                  {/* กล่องข้อมูลนัดหมาย */}
                  <div className="flex-1 bg-ivory rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <i className="bi bi-person text-gray-400"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-black text-sm">
                          นัดหมายกับ {booking.patient_first_name} {booking.patient_last_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          HN: {booking.hn} | หมอ: {booking.doctor_first_name} {booking.doctor_last_name}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-[#00c0e8]/10 text-[#00c0e8] px-2 py-1 rounded-md font-medium">
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