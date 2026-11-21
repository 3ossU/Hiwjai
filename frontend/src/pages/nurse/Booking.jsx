import React, { useState, useEffect } from 'react';
import axios from 'axios';

// คืนค่าวันที่ปัจจุบันตามเวลาเครื่อง (YYYY-MM-DD) ป้องกันปัญหา UTC shift ตอนดึก
const getLocalDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// แปลงเวลาเป็นนาทีนับจากเที่ยงคืน เช่น '08:30' -> 510
const timeToMinutes = (hhmm) => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return NaN;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// ดึง HH:mm จากค่าที่ API ส่งมาแบบไม่ให้ timezone ของเครื่องเพี้ยน
const parseBookingTimeHHmm = (val) => {
  if (!val) return '';
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) && str.endsWith('Z')) {
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
  }
  const dtMatch = str.match(/[T\s](\d{2}:\d{2})/);
  if (dtMatch) return dtMatch[1];
  const tMatch = str.match(/^(\d{2}:\d{2})/);
  return tMatch ? tMatch[1] : '';
};

const isCancelledStatus = (status) =>
  String(status || '').trim().toLowerCase() === 'cancelled';

const Booking = ({ user }) => {
  // ส่วนจัดการ State
  const [bookings, setBookings] = useState([]); // เก็บรายการนัดหมาย
  const [doctors, setDoctors] = useState([]);   // เก็บรายชื่อแพทย์ที่จะมาแสดงเป็นคอลัมน์
  const [doctorSearch, setDoctorSearch] = useState(''); // คำค้นหารายชื่อแพทย์
  const [patients, setPatients] = useState([]); // เก็บรายชื่อผู้ป่วยสำหรับให้เลือก
  const [patientSearch, setPatientSearch] = useState(''); // คำค้นหารายชื่อผู้ป่วย
  const [selectedDate, setSelectedDate] = useState(getLocalDateString); // วันที่ที่กำลังดูอยู่ (Default = วันนี้)
  const [isLoading, setIsLoading] = useState(true); // สถานะการโหลดข้อมูล

  // [เพิ่มใหม่] เก็บข้อมูลวันลาของแพทย์ (approved) ที่ได้มาจาก API /api/bookings
  const [doctorLeaves, setDoctorLeaves] = useState([]);

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

  // State สำหรับ Modal แจ้งเตือน (แทน alert ทั้งหมด)
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'success', // 'success' | 'error' | 'warning'
    title: '',
    message: '',
  });

  // State สำหรับ Modal ยืนยันยกเลิกนัดหมาย (แทน window.confirm)
  const [confirmCancelModal, setConfirmCancelModal] = useState({
    isOpen: false,
    bookingId: null,
  });
  const [isCancelling, setIsCancelling] = useState(false);

  // ช่วงเวลาทำการ 08:00 - 20:00 (เว้น 12:00 พักเที่ยง 12:00-13:00)
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00'
  ];

  // ตัวเลือกเวลาเริ่ม (08:00 - 19:30 เว้นพักเที่ยง 12:00-12:30)
  const startTimeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  // ตัวเลือกเวลาสิ้นสุด (08:30 - 20:00 เว้นช่วงพักเที่ยง 12:30-13:00)
  const allEndTimeOptions = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
  ];

  // กรองเวลาสิ้นสุดให้มากกว่าเวลาเริ่ม และไม่ข้ามช่วงพักเที่ยง 12:00 - 13:00
  const getValidEndTimes = (startStr) => {
    const startMin = timeToMinutes(startStr);
    if (Number.isNaN(startMin)) return allEndTimeOptions;
    const isMorning = startMin < timeToMinutes('12:00');
    return allEndTimeOptions.filter((endStr) => {
      const endMin = timeToMinutes(endStr);
      if (endMin <= startMin) return false;
      if (isMorning && endMin > timeToMinutes('12:00')) return false;
      return true;
    });
  };

  const validEndTimes = getValidEndTimes(formData.start_time);

  const showAlert = (type, title, message) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  // ฟังก์ชันดึงข้อมูลนัดหมายตามวันที่เลือก
  const fetchBookings = async (date) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`http://localhost:5001/api/bookings?date=${date}`);
      if (res.data.success) {
        setBookings(Array.isArray(res.data.data) ? res.data.data : []);
        // [เพิ่มใหม่] เก็บวันลาแพทย์ที่ API ส่งกลับมาด้วย
        setDoctorLeaves(Array.isArray(res.data.doctor_leaves) ? res.data.doctor_leaves : []);
      }
    } catch (error) {
      console.error("ดึงข้อมูลนัดหมายไม่สำเร็จ:", error);
      showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลนัดหมายได้');
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันดึงรายชื่อแพทย์ทั้งหมด
  const fetchDoctors = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/doctors');
      if (res.data.success) {
        const colors = [
          'bg-blue-50 text-blue-700 border-blue-200',
          'bg-purple-50 text-purple-700 border-purple-200',
          'bg-green-50 text-green-700 border-green-200',
          'bg-orange-50 text-orange-700 border-orange-200',
          'bg-pink-50 text-pink-700 border-pink-200'
        ];

        const formattedDoctors = res.data.data.map((doc, index) => {
          let title = '';
          if (doc.gender === 'male') title = 'นพ.';
          else if (doc.gender === 'female') title = 'พญ.';

          const fullName = `${doc.first_name || ''} ${doc.last_name || ''}`.trim();
          const displayName = `${title ? `${title} ` : ''}${fullName}`.trim();

          return {
            id: doc.id,
            name: displayName,
            color: colors[index % colors.length]
          };
        });

        setDoctors(formattedDoctors);

        if (formattedDoctors.length > 0 && !formData.doctor_id) {
          setFormData(prev => ({ ...prev, doctor_id: formattedDoctors[0].id.toString() }));
        }
      }
    } catch (error) {
      console.error("ดึงข้อมูลแพทย์ไม่สำเร็จ:", error);
    }
  };

  // ฟังก์ชันดึงรายชื่อผู้ป่วยทั้งหมด
  const fetchPatients = async () => {
    try {
      const res = await axios.get('http://localhost:5004/api/patients');
      if (res.data.success) {
        setPatients(res.data.data);
      }
    } catch (error) {
      console.error("ดึงข้อมูลผู้ป่วยไม่สำเร็จ:", error);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate]);

  // Helper ดึงข้อมูลผู้ป่วยให้รองรับชื่อฟิลด์ที่อาจต่างกันในแต่ละ endpoint
  const normalizePatient = (p) => {
    const id = p.patient_id ?? p.id;
    const firstName = p.patient_first_name ?? p.first_name ?? '';
    const lastName = p.patient_last_name ?? p.last_name ?? '';
    const hn = p.hn ?? '';
    const avatarUrl = p.avatar_url ?? p.patient_avatar_url ?? '';
    return {
      id,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      hn,
      avatarUrl,
    };
  };

  // กรองรายชื่อผู้ป่วยตามคำค้นหา (ชื่อ นามสกุล หรือ HN)
  const filteredPatients = patients
    .map(normalizePatient)
    .filter((p) => {
      const keyword = patientSearch.trim().toLowerCase();
      if (!keyword) return true;
      return p.fullName.toLowerCase().includes(keyword) || String(p.hn).toLowerCase().includes(keyword);
    });

  // กรองรายชื่อแพทย์ตามคำค้นหา
  const filteredDoctors = doctors.filter((doc) => {
    const keyword = doctorSearch.trim().toLowerCase();
    if (!keyword) return true;
    return doc.name.toLowerCase().includes(keyword);
  });

  // [เพิ่มใหม่] ตรวจสอบว่าแพทย์คนนี้ลาวันที่ระบุหรือไม่
  // คืนค่า leave object ถ้าลา, คืน null ถ้าไม่ลา
  const getDoctorLeaveOnDate = (doctorId, dateStr) => {
    if (!dateStr) return null;
    return doctorLeaves.find((lv) => {
      if (Number(lv.doctor_id) !== Number(doctorId)) return false;
      const start = String(lv.start_date).slice(0, 10);
      const end = String(lv.end_date).slice(0, 10);
      return dateStr >= start && dateStr <= end;
    }) || null;
  };

  // ฟังก์ชันจัดการเมื่อพิมพ์ในฟอร์ม และปรับเวลาสิ้นสุดอัตโนมัติหากไม่สัมพันธ์กับเวลาเริ่ม
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'start_time') {
      const nextEnds = getValidEndTimes(value);
      setFormData((prev) => ({
        ...prev,
        start_time: value,
        end_time: nextEnds.includes(prev.end_time) ? prev.end_time : (nextEnds[0] || value),
      }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ตรวจสอบความถูกต้องของช่วงเวลา (08:00 - 20:00, ห้ามคาบเกี่ยวพักเที่ยง 12:00 - 13:00)
  const validateBookingTime = (startStr, endStr) => {
    const startMin = timeToMinutes(startStr);
    const endMin = timeToMinutes(endStr);
    const openMin = timeToMinutes('08:00');
    const closeMin = timeToMinutes('20:00');
    const lunchStartMin = timeToMinutes('12:00');
    const lunchEndMin = timeToMinutes('13:00');

    if (Number.isNaN(startMin) || Number.isNaN(endMin)) {
      return 'กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุดให้ถูกต้อง';
    }
    if (startMin < openMin || endMin > closeMin) {
      return 'เวลาทำการเปิดให้บริการได้ระหว่าง 08:00 - 20:00 น. เท่านั้น';
    }
    if (endMin <= startMin) {
      return 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น';
    }
    if (startMin < lunchEndMin && endMin > lunchStartMin) {
      return 'ช่วงเวลา 12:00 - 13:00 น. เป็นเวลาพักกลางวันของแพทย์ ไม่สามารถนัดหมายได้';
    }
    return null;
  };

  // ตรวจสอบว่าผู้ป่วยมีนัดหมายอื่น (ไม่ว่าจะกับหมอคนไหน) ที่เวลาทับกันหรือไม่
  const hasPatientTimeOverlap = (patientId, startStr, endStr) => {
    const newStart = timeToMinutes(startStr);
    const newEnd = timeToMinutes(endStr);
    if (Number.isNaN(newStart) || Number.isNaN(newEnd)) return false;

    return bookings.some((b) => {
      if (isCancelledStatus(b.status)) return false;
      if (Number(b.patient_id) !== Number(patientId)) return false;
      const bStart = timeToMinutes(parseBookingTimeHHmm(b.start_time));
      const bEnd = timeToMinutes(parseBookingTimeHHmm(b.end_time));
      if (Number.isNaN(bStart)) return false;
      const effectiveEnd = !Number.isNaN(bEnd) && bEnd > bStart ? bEnd : bStart + 60;
      return newStart < effectiveEnd && newEnd > bStart;
    });
  };

  // ฟังก์ชันบันทึกการจองคิวใหม่
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.doctor_id || !formData.start_time || !formData.end_time) {
      showAlert('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกผู้ป่วย แพทย์ และระบุเวลาให้ครบถ้วน');
      return;
    }

    const timeError = validateBookingTime(formData.start_time, formData.end_time);
    if (timeError) {
      showAlert('warning', 'ช่วงเวลาไม่ถูกต้อง', timeError);
      return;
    }

    // [เพิ่มใหม่] ตรวจสอบซ้ำอีกชั้นว่าแพทย์ลาวันที่เลือกหรือไม่ (กันกรณี UI ถูก bypass)
    const doctorOnLeave = getDoctorLeaveOnDate(formData.doctor_id, selectedDate);
    if (doctorOnLeave) {
      showAlert(
        'warning',
        'แพทย์ลาวันนี้',
        `แพทย์ท่านนี้มีวันลาในวันที่เลือก กรุณาเลือกแพทย์ท่านอื่นหรือเปลี่ยนวันที่`
      );
      return;
    }

    if (hasPatientTimeOverlap(formData.patient_id, formData.start_time, formData.end_time)) {
      showAlert(
        'warning',
        'ผู้ป่วยมีนัดหมายซ้อนกัน',
        'ผู้ป่วยรายนี้มีนัดหมายในช่วงเวลานี้แล้ว (แม้คนละแพทย์) กรุณาเลือกช่วงเวลาอื่น'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = `${selectedDate} ${formData.start_time}:00`;
      const endDateTime = `${selectedDate} ${formData.end_time}:00`;

      const res = await axios.post('http://localhost:5001/api/bookings', {
        patient_id: parseInt(formData.patient_id, 10),
        doctor_id: parseInt(formData.doctor_id, 10),
        created_by_nurse_id: user?.id || 2,
        appointment_date: selectedDate,
        start_time: startDateTime,
        end_time: endDateTime,
        note: formData.note
      });

      if (res.data.success) {
        setIsModalOpen(false);
        setPatientSearch('');
        setDoctorSearch('');
        setFormData(prev => ({
          ...prev,
          patient_id: '',
          start_time: '09:00',
          end_time: '10:00',
          note: ''
        }));
        await fetchBookings(selectedDate);
        showAlert('success', 'จองคิวสำเร็จ', 'บันทึกการนัดหมายลงตารางเรียบร้อยแล้ว');
      }
    } catch (error) {
      console.error("จองคิวไม่สำเร็จ:", error);
      const errMsg = error?.response?.data?.error;
      showAlert(
        'error',
        error?.response?.status === 409 ? 'ไม่สามารถจองคิวได้' : 'จองคิวไม่สำเร็จ',
        errMsg || 'เกิดข้อผิดพลาดในการจองคิว'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // เปิด Modal ยืนยันยกเลิกนัดหมาย
  const handleOpenCancelModal = (id) => {
    setConfirmCancelModal({
      isOpen: true,
      bookingId: id,
    });
  };

  // ยืนยันยกเลิกนัดหมาย (เก็บประวัติใน DB ตามเดิม แต่ซ่อนออกจากตารางหน้าบ้าน)
  const handleConfirmCancelBooking = async () => {
    if (!confirmCancelModal.bookingId) return;
    setIsCancelling(true);
    try {
      const res = await axios.patch(`http://localhost:5001/api/bookings/${confirmCancelModal.bookingId}/cancel`);
      if (res.data.success) {
        setConfirmCancelModal({ isOpen: false, bookingId: null });
        await fetchBookings(selectedDate);
        showAlert('success', 'ยกเลิกสำเร็จ', 'ยกเลิกนัดหมายและนำออกจากตารางเรียบร้อยแล้ว');
      }
    } catch (error) {
      console.error("ยกเลิกนัดหมายไม่สำเร็จ:", error);
      showAlert('error', 'ยกเลิกไม่สำเร็จ', 'ไม่สามารถยกเลิกนัดหมายได้');
    } finally {
      setIsCancelling(false);
    }
  };

  // ฟังก์ชันช่วยหาคิวนัดหมายที่ตรงกับช่อง [เวลา][หมอ] (ไม่แสดงรายการที่ถูกยกเลิกแล้ว)
  const getBookingForSlot = (time, doctorId) => {
    const slotMin = timeToMinutes(time);
    return bookings.find((b) => {
      if (isCancelledStatus(b.status)) return false;
      if (Number(b.doctor_id) !== Number(doctorId)) return false;
      const startHHmm = parseBookingTimeHHmm(b.start_time);
      const endHHmm = parseBookingTimeHHmm(b.end_time);
      const startMin = timeToMinutes(startHHmm);
      const endMin = timeToMinutes(endHHmm);

      if (Number.isNaN(startMin)) return false;
      if (!Number.isNaN(endMin) && endMin > startMin) {
        return startMin <= slotMin && slotMin < endMin;
      }
      return startMin === slotMin;
    });
  };

  // ฟังก์ชันแปลงวันที่ให้เป็นภาษาไทยอ่านง่าย
  const formatDateThai = (dateString) => {
    if (!dateString) return '';
    const [y, m, d] = String(dateString).split('-').map(Number);
    if (y && m && d) {
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    }
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
          <p className="text-sm text-gray-500 mt-1">
            ตรวจสอบและจัดการคิวคนไข้ประจำวันที่ {formatDateThai(selectedDate)} (เวลาทำการ 08:00 - 20:00 น. | พักเที่ยง 12:00 - 13:00 น.)
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm font-medium"
          />
          <button
            onClick={() => {
              setPatientSearch('');
              setDoctorSearch('');
              setIsModalOpen(true);
            }}
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
                  {doctors.map(doc => {
                    // [เพิ่มใหม่] เช็คว่าแพทย์คนนี้ลาวันที่เลือกหรือไม่
                    const onLeave = getDoctorLeaveOnDate(doc.id, selectedDate);
                    return (
                      <th key={doc.id} className="p-4 border-b border-gray-100 text-center font-bold text-black min-w-45">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-2">
                            <i className="bi bi-person-badge text-[#00c0e8]"></i>
                            {doc.name}
                          </div>
                          {/* {onLeave && (
                            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
                              <i className="bi bi-calendar-x mr-1"></i>ลา
                            </span>
                          )} */}
                        </div>
                      </th>
                    );
                  })}
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
                      const booking = getBookingForSlot(time, doc.id);
                      // [เพิ่มใหม่] เช็คว่าแพทย์ลาช่วงนี้หรือไม่
                      const onLeave = getDoctorLeaveOnDate(doc.id, selectedDate);

                      return (
                        <td key={`${time}-${doc.id}`} className="p-2 border-b border-gray-100 h-20 align-top">
                          {booking ? (
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

                                {booking.status === 'scheduled' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCancelModal(booking.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 text-red-600 p-1 rounded hover:bg-red-200"
                                    title="ยกเลิกนัด"
                                  >
                                    <i className="bi bi-x-lg text-[10px]"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : onLeave ? (
                            // [เพิ่มใหม่] แพทย์ลาวันนี้ — แสดงแถบเทา ไม่ให้กด
                            <div className="h-full rounded-lg bg-gray-100/60 border border-dashed border-gray-200 flex items-center justify-center">
                              <span className="text-[10px] text-gray-400 font-medium">
                                <i className="bi bi-x-circle mr-1"></i>แพทย์ลา
                              </span>
                            </div>
                          ) : (
                            <div
                              className="h-full border border-dashed border-transparent hover:border-[#00c0e8]/30 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                              onClick={() => {
                                const startMin = timeToMinutes(time);
                                const nextMin = Math.min(startMin + 60, timeToMinutes('20:00'));
                                const nextEndTime = `${String(Math.floor(nextMin / 60)).padStart(2, '0')}:${String(nextMin % 60).padStart(2, '0')}`;
                                setPatientSearch('');
                                setDoctorSearch('');
                                setFormData(prev => ({
                                  ...prev,
                                  doctor_id: doc.id.toString(),
                                  start_time: time,
                                  end_time: nextEndTime > time ? nextEndTime : '20:00'
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-end md:justify-center z-999 pt-20 pb-8 pl-6 pr-4 sm:px-10 md:pl-64">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl max-h-[82vh] flex flex-col">

            {/* หัวข้อ Modal */}
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h2 className="text-xl font-bold text-black flex items-center gap-2">
                <i className="bi bi-calendar-plus text-[#00c0e8]"></i>
                จองคิวแทนผู้ป่วย
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            {/* ฟอร์มกรอกข้อมูล */}
            <form onSubmit={handleCreateBooking} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    เลือกผู้ป่วย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ หรือ HN..."
                    className="px-3 py-1 bg-ivory border border-[#00c0e8]/30 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 w-52"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar border border-gray-200 rounded-xl p-2 bg-gray-50">
                  {filteredPatients.length === 0 ? (
                    <p className="col-span-full text-center text-xs text-gray-400 py-4">ไม่พบรายชื่อผู้ป่วย</p>
                  ) : (
                    filteredPatients.map((p) => {
                      const isSelected = Number(formData.patient_id) === Number(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, patient_id: String(p.id) }))}
                          className={`flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-[#00c0e8]/10 border border-[#00c0e8]/30'
                              : 'hover:bg-white border border-transparent'
                          }`}
                        >
                          <img
                            src={p.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.hn || p.id}`}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover shrink-0 bg-white"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-black truncate">{p.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">HN: {p.hn || '-'}</p>
                          </div>
                          {isSelected && (
                            <i className="bi bi-check-circle-fill text-[#00c0e8] text-sm shrink-0"></i>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    เลือกแพทย์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="ค้นหาชื่อแพทย์..."
                    className="px-3 py-1 bg-ivory border border-[#00c0e8]/30 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 w-52"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar border border-gray-200 rounded-xl p-2 bg-gray-50">
                  {filteredDoctors.length === 0 ? (
                    <p className="col-span-full text-center text-xs text-gray-400 py-4">ไม่พบรายชื่อแพทย์</p>
                  ) : (
                    filteredDoctors.map((doc) => {
                      const isSelected = Number(formData.doctor_id) === Number(doc.id);
                      // [เพิ่มใหม่] เช็คว่าแพทย์คนนี้ลาวันที่เลือกหรือไม่
                      const onLeave = getDoctorLeaveOnDate(doc.id, selectedDate);
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          disabled={onLeave}
                          onClick={() => !onLeave && setFormData(prev => ({ ...prev, doctor_id: String(doc.id) }))}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                            onLeave
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-[#00c0e8] text-white font-semibold shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-[#00c0e8]/10 border border-gray-100'
                          }`}
                        >
                          <span className="text-sm truncate">
                            {doc.name}
                            {onLeave && <span className="ml-2 text-[10px] text-red-500">(ลา)</span>}
                          </span>
                          {isSelected && !onLeave && <i className="bi bi-check-lg text-sm shrink-0"></i>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ตัวเลือกเวลาแบบสมูท เลือกง่าย */}
              <div className="bg-ivory/70 border border-[#00c0e8]/20 rounded-2xl p-4 space-y-3">
                <span className="block text-sm font-semibold text-gray-700">
                  ช่วงเวลานัดหมาย (08:00 - 20:00 น.) <span className="text-red-500">*</span>
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">เวลาเริ่ม</label>
                    <div className="relative flex items-center">
                      <select
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm font-semibold text-gray-800 appearance-none cursor-pointer"
                      >
                        {startTimeOptions.map((t) => (
                          <option key={t} value={t}>{t} น.</option>
                        ))}
                      </select>
                      <i className="bi bi-clock text-[#00c0e8] text-base absolute right-4 pointer-events-none"></i>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">เวลาสิ้นสุด (สูงสุด 20:00)</label>
                    <div className="relative flex items-center">
                      <select
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm font-semibold text-gray-800 appearance-none cursor-pointer"
                      >
                        {validEndTimes.map((t) => (
                          <option key={t} value={t}>{t} น.</option>
                        ))}
                      </select>
                      <i className="bi bi-clock text-[#00c0e8] text-base absolute right-4 pointer-events-none"></i>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  * พักกลางวัน 12:00 - 13:00 น. และปิดทำการหลัง 20:00 น.
                </p>
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
              <div className="pt-3 flex gap-3 shrink-0">
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

      {/* Modal ยืนยันยกเลิกนัดหมาย */}
      {confirmCancelModal.isOpen && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 md:pl-64">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-100 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl bg-red-100 text-red-600">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการยกเลิกนัดหมาย</h3>
            <p className="text-sm text-gray-500 mb-6">คุณต้องการยกเลิกนัดหมายนี้ใช่หรือไม่?</p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setConfirmCancelModal({ isOpen: false, bookingId: null })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelBooking}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-sm transition-colors shadow-md ${
                  isCancelling ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                }`}
              >
                {isCancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แจ้งเตือนผลลัพธ์ (แทน alert ทั้งหมด) */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-1010 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 md:pl-64">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#00c0e8]/20 text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl ${
                alertModal.type === 'success'
                  ? 'bg-[#00c0e8]/15 text-[#00c0e8]'
                  : alertModal.type === 'warning'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              <i
                className={`bi ${
                  alertModal.type === 'success'
                    ? 'bi-check-circle-fill'
                    : alertModal.type === 'warning'
                    ? 'bi-exclamation-circle-fill'
                    : 'bi-x-circle-fill'
                }`}
              ></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{alertModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{alertModal.message}</p>
            <button
              type="button"
              onClick={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm transition-colors shadow-md ${
                alertModal.type === 'success'
                  ? 'bg-[#00c0e8] hover:bg-[#00a8cc] shadow-[#00c0e8]/30'
                  : alertModal.type === 'warning'
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                  : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Booking;
