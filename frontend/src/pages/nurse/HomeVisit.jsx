import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VISIT_FILTERS = [
  { key: 'all', label: 'ทั้งหมด', icon: 'bi-grid' },
  { key: 'active', label: 'ที่ต้องออกตรวจ', icon: 'bi-truck' },
  { key: 'cancelled', label: 'ยกเลิกแล้ว', icon: 'bi-x-circle' },
];

// ตรวจสอบว่ารอบเยี่ยมบ้านเลยเวลาสิ้นสุดไปแล้วหรือยัง (เฉพาะรอบที่ยังไม่ completed และยังไม่ cancelled)
const isVisitOverdue = (visit) => {
  if (!visit || visit.status === 'completed' || visit.status === 'cancelled') return false;
  const endRaw = visit.end_time || visit.visit_date;
  if (!endRaw) return false;

  const endStr = String(endRaw).trim();
  let endDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
    const [y, m, d] = endStr.split('-').map(Number);
    endDate = new Date(y, m - 1, d, 23, 59, 59);
  } else {
    const normalized = endStr.includes('T') ? endStr : endStr.replace(' ', 'T');
    endDate = new Date(normalized);
  }

  if (Number.isNaN(endDate.getTime())) return false;
  return Date.now() > endDate.getTime();
};

const HomeVisit = ({ user }) => {
  // State เก็บรายการรอบเยี่ยมบ้าน
  const [visits, setVisits] = useState([]);
  // State เก็บตัวกรองรายการรอบเยี่ยมบ้าน
  const [statusFilter, setStatusFilter] = useState('all');
  // State เก็บรายชื่อแพทย์ (สำหรับทำ Dropdown)
  const [doctors, setDoctors] = useState([]);
  // State เก็บรายชื่อคนไข้ทั้งหมด (สำหรับให้เลือกใน Modal)
  const [patients, setPatients] = useState([]);
  // State เช็คว่ากำลังโหลดข้อมูลอยู่ไหม
  const [isLoading, setIsLoading] = useState(true);

  // State สำหรับควบคุมการเปิด/ปิด Modal สร้างหรือแก้ไขรอบเยี่ยมบ้าน
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState(null);
  // State เช็คว่ากำลังบันทึกข้อมูลอยู่ไหม
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State สำหรับ Modal แจ้งเตือนผลลัพธ์ (แทน alert)
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'success', // 'success' | 'error' | 'warning'
    title: '',
    message: '',
  });

  // State สำหรับ Modal ยืนยันการยกเลิกรอบเยี่ยมบ้าน (แทน window.confirm)
  const [confirmCancelModal, setConfirmCancelModal] = useState({
    isOpen: false,
    visitId: null,
    teamName: '',
  });
  const [isCancelling, setIsCancelling] = useState(false);

  // State สำหรับ Modal ยืนยันการอัปเดตสถานะทั้งรอบเป็นเสร็จสิ้น
  const [confirmCompleteModal, setConfirmCompleteModal] = useState({
    isOpen: false,
    visitId: null,
    teamName: '',
  });
  const [isCompleting, setIsCompleting] = useState(false);

  // State เก็บข้อมูลจากฟอร์มสร้าง/แก้ไขรอบเยี่ยมบ้าน
  const [formData, setFormData] = useState({
    team_name: '',
    lead_doctor_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '12:00',
    status: 'planned',
    patient_ids: [] // เก็บเป็น Array เพราะ 1 รอบมีคนไข้ได้หลายคน
  });

  // เติมคำนำหน้า นพ. / พญ. ตามเพศ (เหมือนฝั่ง Booking.jsx)
  const formatDoctorTitleName = (firstName, lastName, gender) => {
    let title = '';
    if (gender === 'male') title = 'นพ.';
    else if (gender === 'female') title = 'พญ.';
    return `${title ? `${title} ` : ''}${firstName || ''} ${lastName || ''}`.trim();
  };

  // ฟังก์ชันดึงข้อมูลรอบเยี่ยมบ้านทั้งหมด
  const fetchVisits = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5002/api/home-visits');
      if (res.data.success) {
        setVisits(res.data.data);
      }
    } catch (error) {
      console.error("ดึงข้อมูลรอบเยี่ยมบ้านไม่สำเร็จ:", error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถดึงข้อมูลรอบเยี่ยมบ้านได้',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันดึงรายชื่อแพทย์ (ยืม API จาก booking-service)
  const fetchDoctors = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/doctors');
      if (res.data.success) {
        setDoctors(res.data.data);
        if (res.data.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            lead_doctor_id: prev.lead_doctor_id || res.data.data[0].id.toString()
          }));
        }
      }
    } catch (error) {
      console.error("ดึงข้อมูลแพทย์ไม่สำเร็จ:", error);
    }
  };

  // ฟังก์ชันดึงรายชื่อคนไข้ทั้งหมด (เพื่อเอามาให้ติ๊กเลือกใน Modal)
  const fetchPatients = async () => {
    try {
      const res = await axios.get('http://localhost:5004/api/patients');
      if (res.data.success) {
        setPatients(res.data.data);
      }
    } catch (error) {
      console.error("ดึงข้อมูลคนไข้ไม่สำเร็จ:", error);
    }
  };

  // โหลดข้อมูลทั้งหมดทันทีที่เข้าหน้า
  useEffect(() => {
    fetchVisits();
    fetchDoctors();
    fetchPatients();
  }, []);

  // นับจำนวนแต่ละกลุ่มสำหรับแสดงบนปุ่ม Filter
  const activeVisitsCount = visits.filter((v) => v.status !== 'cancelled').length;
  const cancelledVisitsCount = visits.filter((v) => v.status === 'cancelled').length;

  // กรองรายการรอบเยี่ยมบ้านตามแท็บที่เลือก
  const filteredVisits = visits.filter((visit) => {
    if (statusFilter === 'active') return visit.status !== 'cancelled';
    if (statusFilter === 'cancelled') return visit.status === 'cancelled';
    return true;
  });

  const getFilterCount = (key) => {
    if (key === 'active') return activeVisitsCount;
    if (key === 'cancelled') return cancelledVisitsCount;
    return visits.length;
  };

  // เปิด Modal สร้างรอบเยี่ยมบ้านใหม่
  const handleOpenCreateModal = () => {
    setEditingVisitId(null);
    setFormData({
      team_name: '',
      lead_doctor_id: doctors.length > 0 ? doctors[0].id.toString() : '',
      visit_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '12:00',
      status: 'planned',
      patient_ids: []
    });
    setIsModalOpen(true);
  };

  // เปิด Modal แก้ไขรอบเยี่ยมบ้าน (เช่น เปลี่ยนหมอหัวหน้าทีม)
  const handleOpenEditModal = (visit) => {
    setEditingVisitId(visit.id);
    setFormData({
      team_name: visit.team_name || '',
      lead_doctor_id: visit.lead_doctor_id ? visit.lead_doctor_id.toString() : '',
      visit_date: String(visit.visit_date || '').slice(0, 10) || new Date().toISOString().split('T')[0],
      start_time: String(visit.start_time || '').substring(11, 16) || '09:00',
      end_time: String(visit.end_time || '').substring(11, 16) || '12:00',
      status: visit.status || 'planned',
      patient_ids: (visit.patients || []).map((p) => p.patient_id)
    });
    setIsModalOpen(true);
  };

  // ฟังก์ชันอัปเดตค่าฟอร์มเมื่อมีการพิมพ์
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ฟังก์ชันสำหรับติ๊กเลือก/ยกเลิกเลือกคนไข้
  const handlePatientToggle = (patientId) => {
    setFormData(prev => {
      const isSelected = prev.patient_ids.includes(patientId);
      if (isSelected) {
        return { ...prev, patient_ids: prev.patient_ids.filter(id => id !== patientId) };
      } else {
        return { ...prev, patient_ids: [...prev.patient_ids, patientId] };
      }
    });
  };

  // ฟังก์ชันบันทึกการสร้างหรือแก้ไขรอบเยี่ยมบ้าน
  const handleSubmitVisit = async (e) => {
    e.preventDefault();
    if (!formData.team_name.trim() || !formData.lead_doctor_id || formData.patient_ids.length === 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอกชื่อทีม, เลือกแพทย์ และเลือกผู้ป่วยอย่างน้อย 1 คน',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = `${formData.visit_date} ${formData.start_time}:00`;
      const endDateTime = `${formData.visit_date} ${formData.end_time}:00`;

      const payload = {
        team_name: formData.team_name.trim(),
        lead_doctor_id: parseInt(formData.lead_doctor_id, 10),
        visit_date: formData.visit_date,
        start_time: startDateTime,
        end_time: endDateTime,
        status: formData.status,
        patient_ids: formData.patient_ids
      };

      const res = editingVisitId
        ? await axios.put(`http://localhost:5002/api/home-visits/${editingVisitId}`, payload)
        : await axios.post('http://localhost:5002/api/home-visits', payload);

      if (res.data.success) {
        setIsModalOpen(false);
        const wasEditing = Boolean(editingVisitId);
        setEditingVisitId(null);
        setFormData(prev => ({
          ...prev,
          team_name: '',
          status: 'planned',
          patient_ids: []
        }));
        fetchVisits();
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: wasEditing ? 'อัปเดตสำเร็จ' : 'สร้างสำเร็จ',
          message: wasEditing ? 'อัปเดตรอบเยี่ยมบ้านเรียบร้อยแล้ว' : 'สร้างรอบเยี่ยมบ้านใหม่เรียบร้อยแล้ว',
        });
      }
    } catch (error) {
      console.error("บันทึกรอบเยี่ยมบ้านไม่สำเร็จ:", error);
      const errMsg = error?.response?.data?.error;
      setAlertModal({
        isOpen: true,
        type: error?.response?.status === 409 ? 'warning' : 'error',
        title: error?.response?.status === 409 ? 'เวลาแพทย์ชนกัน' : 'เกิดข้อผิดพลาด',
        message: errMsg || 'เกิดข้อผิดพลาดในการบันทึกรอบเยี่ยมบ้าน',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // เปิด Modal ยืนยันอัปเดตสถานะทั้งรอบเป็นเสร็จสิ้น
  const handleOpenCompleteModal = (visit) => {
    setConfirmCompleteModal({
      isOpen: true,
      visitId: visit.id,
      teamName: visit.team_name,
    });
  };

  // ยืนยันอัปเดตสถานะทั้งรอบเป็นเสร็จสิ้น
  const handleConfirmCompleteVisit = async () => {
    if (!confirmCompleteModal.visitId) return;
    setIsCompleting(true);
    try {
      const res = await axios.patch(`http://localhost:5002/api/home-visits/${confirmCompleteModal.visitId}/complete`);
      if (res.data.success) {
        setConfirmCompleteModal({ isOpen: false, visitId: null, teamName: '' });
        fetchVisits();
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'อัปเดตสำเร็จ',
          message: 'อัปเดตสถานะทั้งรอบเป็นเสร็จสิ้นเรียบร้อยแล้ว',
        });
      }
    } catch (error) {
      console.error("อัปเดตสถานะทั้งรอบไม่สำเร็จ:", error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถอัปเดตสถานะทั้งรอบได้',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // ฟังก์ชันอัปเดตสถานะคนไข้รายคน (เช่น เปลี่ยนจากรอเยี่ยม เป็น เยี่ยมแล้ว)
  const handleUpdatePatientStatus = async (visitId, patientId, newStatus) => {
    try {
      const res = await axios.patch(
        `http://localhost:5002/api/home-visits/${visitId}/patients/${patientId}/status`,
        { status: newStatus }
      );
      if (res.data.success) {
        fetchVisits();
      }
    } catch (error) {
      console.error("อัปเดตสถานะไม่สำเร็จ:", error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'อัปเดตไม่สำเร็จ',
        message: 'ไม่สามารถอัปเดตสถานะผู้ป่วยได้',
      });
    }
  };

  // เปิด Modal ยืนยันการยกเลิกรอบเยี่ยมบ้าน
  const handleOpenCancelModal = (visit) => {
    setConfirmCancelModal({
      isOpen: true,
      visitId: visit.id,
      teamName: visit.team_name,
    });
  };

  // ยืนยันการยกเลิกรอบเยี่ยมบ้าน
  const handleConfirmCancelVisit = async () => {
    if (!confirmCancelModal.visitId) return;
    setIsCancelling(true);
    try {
      const res = await axios.delete(`http://localhost:5002/api/home-visits/${confirmCancelModal.visitId}`);
      if (res.data.success) {
        setConfirmCancelModal({ isOpen: false, visitId: null, teamName: '' });
        fetchVisits();
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'ยกเลิกสำเร็จ',
          message: 'ยกเลิกรอบเยี่ยมบ้านเรียบร้อยแล้ว',
        });
      }
    } catch (error) {
      console.error("ยกเลิกรอบเยี่ยมบ้านไม่สำเร็จ:", error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถยกเลิกรอบเยี่ยมบ้านได้',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // ฟังก์ชันแปลงวันที่ให้เป็นภาษาไทยอ่านง่าย
  const formatDateThai = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ฟังก์ชันเลือกสีของป้ายสถานะ
  const getStatusBadge = (status) => {
    switch (status) {
      case 'planned': return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md">วางแผนไว้</span>;
      case 'in_progress': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-md">กำลังดำเนินการ</span>;
      case 'completed': return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">เสร็จสิ้น</span>;
      case 'cancelled': return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md">ยกเลิก</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">

      {/* ส่วนหัวของหน้า ปุ่ม Filter และปุ่มสร้างรอบเยี่ยมบ้าน */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#00c0e8]/20 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-2">
              <i className="bi bi-house-heart text-[#00c0e8]"></i> ตารางเยี่ยมบ้าน
            </h1>
            <p className="text-sm text-gray-500 mt-1">จัดการทีมแพทย์และผู้ป่วยสำหรับการออกเยี่ยมบ้าน</p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#00c0e8] text-white rounded-xl font-bold hover:bg-[#00a8cc] transition-colors shadow-lg shadow-[#00c0e8]/30 whitespace-nowrap"
          >
            <i className="bi bi-plus-lg mr-1"></i> สร้างรอบเยี่ยมบ้าน
          </button>
        </div>

        {/* แถบ Filter: ทั้งหมด / ที่ต้องออกตรวจ / ยกเลิกแล้ว */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
          {VISIT_FILTERS.map((item) => {
            const isActive = statusFilter === item.key;
            const count = getFilterCount(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  isActive
                    ? 'bg-[#00c0e8] text-white border-[#00c0e8] shadow-sm'
                    : 'bg-ivory text-gray-600 border-[#00c0e8]/20 hover:bg-white hover:text-black'
                }`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                    isActive ? 'bg-white/25 text-white' : 'bg-gray-200/80 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* พื้นที่แสดงรายการรอบเยี่ยมบ้าน */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-[#00c0e8]">
            <i className="bi bi-arrow-repeat animate-spin text-4xl"></i>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <i className="bi bi-calendar-x text-6xl mb-4"></i>
            <p>
              {statusFilter === 'active'
                ? 'ไม่มีรอบเยี่ยมบ้านที่ต้องออกตรวจ'
                : statusFilter === 'cancelled'
                ? 'ไม่มีรอบเยี่ยมบ้านที่ถูกยกเลิก'
                : 'ยังไม่มีรายการเยี่ยมบ้านในระบบ'}
            </p>
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const overdue = isVisitOverdue(visit);
            return (
              <div key={visit.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* หัวการ์ด: แสดงข้อมูลทีม วันที่ ปุ่มเสร็จสิ้นทั้งรอบ ปุ่มแก้ไข และปุ่มยกเลิก */}
                <div className="p-5 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-ivory/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#00c0e8] text-white flex items-center justify-center shadow-md">
                      <i className="bi bi-truck text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-black flex flex-wrap items-center gap-2">
                        {visit.team_name}
                        {getStatusBadge(visit.status)}
                        {/* {overdue && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-md flex items-center gap-1">
                            <i className="bi bi-clock-history"></i> เลยกำหนดเวลานัด
                          </span>
                        )} */}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                        <span><i className="bi bi-calendar3 mr-1"></i> {formatDateThai(visit.visit_date)}</span>
                        <span><i className="bi bi-clock mr-1"></i> {visit.start_time.substring(11, 16)} - {visit.end_time.substring(11, 16)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-medium">หัวหน้าทีมแพทย์</p>
                      <p className="text-sm font-semibold text-black">
                        {formatDoctorTitleName(visit.doctor_first_name, visit.doctor_last_name, visit.lead_doctor_gender || visit.doctor_gender)}
                      </p>
                    </div>
                    {visit.status !== 'cancelled' && visit.status !== 'completed' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCompleteModal(visit)}
                          className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          เสร็จสิ้น
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(visit)}
                          className="px-4 py-2 bg-[#00c0e8]/10 text-[#0095b6] border border-[#00c0e8]/30 text-sm font-bold rounded-lg hover:bg-[#00c0e8]/20 transition-colors"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(visit)}
                          className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition-colors"
                        >
                          ยกเลิกรอบ
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* รายละเอียดผู้ป่วยในรอบเยี่ยมบ้าน */}
                <div className="p-5">
                  <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                    <i className="bi bi-people-fill text-[#00c0e8]"></i> รายชื่อผู้ป่วย ({visit.patients?.length || 0} คน)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visit.patients?.map((patient) => (
                      <div key={patient.patient_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="font-semibold text-sm text-black">{patient.patient_name}</p>
                          <p className="text-xs text-gray-500">HN: {patient.hn}</p>
                        </div>

                        <select
                          value={patient.patient_status}
                          onChange={(e) => handleUpdatePatientStatus(visit.id, patient.patient_id, e.target.value)}
                          disabled={visit.status === 'cancelled'}
                          className={`text-xs font-bold px-2 py-1.5 rounded-lg border outline-none cursor-pointer ${
                            patient.patient_status === 'visited' ? 'bg-green-50 text-green-700 border-green-200' :
                            patient.patient_status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          <option value="scheduled">รอเยี่ยม</option>
                          <option value="visited">เยี่ยมแล้ว</option>
                          <option value="cancelled">ยกเลิก</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal สำหรับสร้าง / แก้ไขรอบเยี่ยมบ้าน */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold text-black flex items-center gap-2">
                <i className={`bi ${editingVisitId ? 'bi-pencil-square' : 'bi-plus-circle'} text-[#00c0e8]`}></i>
                {editingVisitId ? 'แก้ไขรอบเยี่ยมบ้าน' : 'สร้างรอบเยี่ยมบ้านใหม่'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitVisit} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อทีม <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="team_name"
                  value={formData.team_name}
                  onChange={handleInputChange}
                  placeholder="เช่น ทีมพยาบาลชุมชน A"
                  className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">หัวหน้าทีมแพทย์ <span className="text-red-500">*</span></label>
                <select
                  name="lead_doctor_id"
                  value={formData.lead_doctor_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                  required
                >
                  <option value="">-- เลือกแพทย์ --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {formatDoctorTitleName(doc.first_name, doc.last_name, doc.gender)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">วันที่ <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="visit_date"
                    value={formData.visit_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                    required
                  />
                </div>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เลือกผู้ป่วยที่ต้องเยี่ยม <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 font-normal ml-2">(เลือกแล้ว {formData.patient_ids.length} คน)</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar border border-gray-200 rounded-xl p-2 bg-gray-50">
                  {patients.map(p => (
                    <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.patient_ids.includes(p.id) ? 'bg-[#00c0e8]/10 border-[#00c0e8]/30 border' : 'hover:bg-white border border-transparent'}`}>
                      <input
                        type="checkbox"
                        checked={formData.patient_ids.includes(p.id)}
                        onChange={() => handlePatientToggle(p.id)}
                        className="w-4 h-4 text-[#00c0e8] rounded focus:ring-[#00c0e8]"
                      />
                      <div className="flex items-center gap-2">
                        <img
                          src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.hn}`}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-semibold text-black">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-gray-500">HN: {p.hn}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3 shrink-0">
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
                  className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors shadow-lg ${
                    isSubmitting ? 'bg-gray-400' : 'bg-[#00c0e8] hover:bg-[#00a8cc] shadow-[#00c0e8]/30'
                  }`}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : editingVisitId ? 'บันทึกการแก้ไข' : 'สร้างรอบเยี่ยมบ้าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ยืนยันอัปเดตสถานะทั้งรอบเป็นเสร็จสิ้น */}
      {confirmCompleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-emerald-100 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl bg-emerald-100 text-emerald-600">
              <i className="bi bi-check2-circle"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันเสร็จสิ้น</h3>
            <p className="text-sm text-gray-500 mb-6">
              ต้องการอัปเดตสถานะของ <span className="font-semibold text-gray-800">{confirmCompleteModal.teamName}</span> เป็นเสร็จสิ้น และเปลี่ยนผู้ป่วยที่รอเยี่ยมเป็นเยี่ยมแล้วใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCompleting}
                onClick={() => setConfirmCompleteModal({ isOpen: false, visitId: null, teamName: '' })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={isCompleting}
                onClick={handleConfirmCompleteVisit}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-sm transition-colors shadow-md ${
                  isCompleting ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {isCompleting ? 'กำลังบันทึก...' : 'ยืนยันเสร็จสิ้น'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการยกเลิกรอบเยี่ยมบ้าน */}
      {confirmCancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-100 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl bg-red-100 text-red-600">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการยกเลิกรอบเยี่ยมบ้าน</h3>
            <p className="text-sm text-gray-500 mb-6">
              ต้องการยกเลิกรอบเยี่ยมบ้านของ <span className="font-semibold text-gray-800">{confirmCancelModal.teamName}</span> ใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setConfirmCancelModal({ isOpen: false, visitId: null, teamName: '' })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelVisit}
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

      {/* Modal แจ้งเตือนผลลัพธ์ (แทน alert) */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
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

export default HomeVisit;