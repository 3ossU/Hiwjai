import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Booking = ({ user }) => {
  // ส่วนจัดการ State
  const [bookings, setBookings] = useState([]); // เก็บรายการนัดหมาย
  const [doctors, setDoctors] = useState([]);   // เก็บรายชื่อแพทย์ที่จะมาแสดงเป็นคอลัมน์
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // วันที่ที่กำลังดูอยู่ (Default = วันนี้)
  const [isLoading, setIsLoading] = useState(true); // สถานะการโหลดข้อมูล

  // State สำหรับ Modal จองคิว
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    start_time: '09:00',
    end_time: '10:00',
    note: ''
  });

  // กำหนดช่วงเวลาทำการ (08:00 - 17:00) เพื่อเอาไปสร้างแถวในตาราง
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00'
  ];

  // ฟังก์ชันดึงข้อมูลนัดหมายตามวันที่เลือก
  const fetchBookings = async (date) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`http://localhost:5001/api/bookings?date=${date}`);
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (error) {
      console.error("ดึงข้อมูลนัดหมายไม่สำเร็จ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันดึงรายชื่อแพทย์ทั้งหมด
  const fetchDoctors = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/doctors');
      if (res.data.success) {
        // กำหนดชุดสีพื้นหลังสำหรับการ์ดนัดหมายของหมอแต่ละคน
        const colors = [
          'bg-blue-50 text-blue-700 border-blue-200',
          'bg-purple-50 text-purple-700 border-purple-200',
          'bg-green-50 text-green-700 border-green-200',
          'bg-orange-50 text-orange-700 border-orange-200',
          'bg-pink-50 text-pink-700 border-pink-200'
        ];

        // แปลงข้อมูลหมอให้พร้อมใช้งาน (เติมคำนำหน้าตามเพศ และใส่สี)
        const formattedDoctors = res.data.data.map((doc, index) => {
          let title = '';
          if (doc.gender === 'male') title = 'นพ.';
          else if (doc.gender === 'female') title = 'พญ.';

          return {
            id: doc.id,
            name: `${title} ${doc.first_name} ${doc.last_name}`,
            color: colors[index % colors.length]
          };
        });

        setDoctors(formattedDoctors);

        // ถ้ามีหมอในระบบ ให้เลือกหมอคนแรกเป็นค่าเริ่มต้นในฟอร์ม
        if (formattedDoctors.length > 0 && !formData.doctor_id) {
          setFormData(prev => ({ ...prev, doctor_id: formattedDoctors[0].id.toString() }));
        }
      }
    } catch (error) {
      console.error("ดึงข้อมูลแพทย์ไม่สำเร็จ:", error);
    }
  };

  // โหลดรายชื่อแพทย์ทันทีที่เข้าหน้า
  useEffect(() => {
    fetchDoctors();
  }, []);

  // โหลดนัดหมายใหม่ทุกครั้งที่เปลี่ยนวันที่
  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate]);

  // ฟังก์ชันจัดการเมื่อพิมพ์ในฟอร์ม
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ฟังก์ชันบันทึกการจองคิวใหม่
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.doctor_id || !formData.start_time || !formData.end_time) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    try {
      // แปลงวันที่และเวลาให้อยู่ในฟอร์แมตที่ Database ต้องการ (YYYY-MM-DD HH:mm:ss)
      const startDateTime = `${selectedDate} ${formData.start_time}:00`;
      const endDateTime = `${selectedDate} ${formData.end_time}:00`;

      const res = await axios.post('http://localhost:5001/api/bookings', {
        patient_id: parseInt(formData.patient_id),
        doctor_id: parseInt(formData.doctor_id),
        created_by_nurse_id: user?.id || 2,
        appointment_date: selectedDate,
        start_time: startDateTime,
        end_time: endDateTime,
        note: formData.note
      });

      if (res.data.success) {
        alert('จองคิวสำเร็จ!');
        setIsModalOpen(false);
        // ล้างข้อมูลในฟอร์ม (ยกเว้นแพทย์ให้คงไว้)
        setFormData(prev => ({
          ...prev,
          patient_id: '',
          start_time: '09:00',
          end_time: '10:00',
          note: ''
        }));
        fetchBookings(selectedDate); // รีเฟรชตาราง
      }
    } catch (error) {
      console.error("จองคิวไม่สำเร็จ:", error);
      alert('เกิดข้อผิดพลาดในการจองคิว');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันยกเลิกนัดหมาย
  const handleCancelBooking = async (id) => {
    if (!window.confirm('คุณต้องการยกเลิกนัดหมายนี้ใช่หรือไม่?')) return;

    try {
      const res = await axios.patch(`http://localhost:5001/api/bookings/${id}/cancel`);
      if (res.data.success) {
        alert('ยกเลิกนัดหมายสำเร็จ');
        fetchBookings(selectedDate);
      }
    } catch (error) {
      console.error("ยกเลิกนัดหมายไม่สำเร็จ:", error);
      alert('ไม่สามารถยกเลิกนัดหมายได้');
    }
  };

  // ฟังก์ชันช่วยหาคิวนัดหมายที่ตรงกับช่อง [เวลา][หมอ]
  const getBookingForSlot = (time, doctorId) => {
    // หาใน Array ว่ามีการจองของหมอคนนี้ ในเวลานี้หรือไม่
    return bookings.find(b =>
      b.doctor_id === doctorId &&
      b.start_time.substring(11, 16) === time // ตัดเอาแค่ HH:mm จาก String
    );
  };

  // ฟังก์ชันแปลงวันที่ให้เป็นภาษาไทยอ่านง่าย
  const formatDateThai = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">

      {/* Header & ตัวกรองวันที่ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#00c0e8]/20">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <i className="bi bi-calendar-week text-[#00c0e8]"></i> ตารางนัดหมาย
          </h1>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบและจัดการคิวคนไข้ประจำวันที่ {formatDateThai(selectedDate)}</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm font-medium"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#00c0e8] text-white rounded-xl font-bold hover:bg-[#00a8cc] transition-colors shadow-lg shadow-[#00c0e8]/30 whitespace-nowrap"
          >
            <i className="bi bi-plus-lg mr-1"></i> จองคิวแทน
          </button>
        </div>
      </div>

      {/* ตารางนัดหมาย (Calendar Grid) */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#00c0e8]/20 overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-[#00c0e8]">
            <i className="bi bi-arrow-repeat animate-spin text-4xl"></i>
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <i className="bi bi-person-x text-6xl mb-4"></i>
            <p>ไม่พบข้อมูลแพทย์ในระบบ</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full border-collapse min-w-200">

              {/* หัวตาราง: แสดงชื่อแพทย์ */}
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr>
                  <th className="p-4 border-b border-r border-gray-100 w-24 text-center text-gray-500 font-bold text-sm">เวลา</th>
                  {doctors.map(doc => (
                    <th key={doc.id} className="p-4 border-b border-gray-100 text-center font-bold text-black min-w-45">
                      <div className="flex items-center justify-center gap-2">
                        <i className="bi bi-person-badge text-[#00c0e8]"></i>
                        {doc.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* เนื้อหาตาราง: ไล่ทีละช่วงเวลา */}
              <tbody>
                {timeSlots.map((time, idx) => (
                  <tr key={time} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {/* คอลัมน์ซ้ายสุด: แสดงเวลา */}
                    <td className="p-3 border-r border-b border-gray-100 text-center text-sm font-semibold text-gray-500">
                      {time}
                    </td>

                    {/* คอลัมน์แพทย์แต่ละท่าน */}
                    {doctors.map(doc => {
                      // เช็คว่าช่องนี้ (เวลานี้ + หมอคนนี้) มีคนจองหรือยัง
                      const booking = getBookingForSlot(time, doc.id);

                      return (
                        <td key={`${time}-${doc.id}`} className="p-2 border-b border-gray-100 h-20 align-top">
                          {booking ? (
                            // ถ้ามีคนจองแล้ว: แสดงการ์ดข้อมูลคนไข้
                            <div className={`p-2.5 rounded-lg border h-full flex flex-col justify-between ${doc.color} shadow-sm relative group`}>
                              <div>
                                <p className="font-bold text-xs truncate" title={`${booking.patient_first_name} ${booking.patient_last_name}`}>
                                  {booking.patient_first_name} {booking.patient_last_name}
                                </p>
                                <p className="text-[10px] opacity-80 mt-0.5 truncate">HN: {booking.hn}</p>
                              </div>

                              <div className="flex justify-between items-end mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 bg-white/50 rounded font-medium">
                                  {booking.status === 'scheduled' ? 'นัดหมาย' : booking.status}
                                </span>

                                {/* ปุ่มยกเลิก (จะโผล่มาตอนเอาเมาส์ชี้) */}
                                {booking.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleCancelBooking(booking.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 text-red-600 p-1 rounded hover:bg-red-200"
                                    title="ยกเลิกนัด"
                                  >
                                    <i className="bi bi-x-lg text-[10px]"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            // ถ้าว่าง: แสดงช่องว่างให้กดจองได้
                            <div
                              className="h-full border border-dashed border-transparent hover:border-[#00c0e8]/30 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                              onClick={() => {
                                // เมื่อคลิกช่องว่าง ให้ Auto-fill เวลาและหมอลงในฟอร์ม
                                setFormData(prev => ({
                                  ...prev,
                                  doctor_id: doc.id.toString(),
                                  start_time: time,
                                  end_time: `${parseInt(time) + 1}:00`.padStart(5, '0')
                                }));
                                setIsModalOpen(true);
                              }}
                            >
                              <span className="text-gray-300 text-xs opacity-0 hover:opacity-100 transition-opacity font-medium">
                                + จองคิว
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal สำหรับจองคิวแทน */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">

            {/* หัวข้อ Modal */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-black flex items-center gap-2">
                <i className="bi bi-calendar-plus text-[#00c0e8]"></i>
                จองคิวแทนผู้ป่วย
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            {/* ฟอร์มกรอกข้อมูล */}
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสผู้ป่วย (Patient ID) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  placeholder="เช่น 1, 2 (ในระบบจริงควรเป็นช่องค้นหา)"
                  className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">เลือกแพทย์ <span className="text-red-500">*</span></label>
                <select
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                >
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">เวลาเริ่ม <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">เวลาสิ้นสุด <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="เช่น คนไข้ไม่สะดวกจองเอง"
                  className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm resize-none"
                ></textarea>
              </div>

              {/* ปุ่ม Cancel / Submit */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors shadow-lg ${isSubmitting ? 'bg-gray-400' : 'bg-[#00c0e8] hover:bg-[#00a8cc] shadow-[#00c0e8]/30'
                    }`}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการจอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Booking;