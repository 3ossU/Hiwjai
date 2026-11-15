import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HomeVisit = ({ user }) => {
  // State เก็บรายการทริปเยี่ยมบ้าน
  const [visits, setVisits] = useState([]);
  // State เก็บรายชื่อแพทย์ (สำหรับทำ Dropdown)
  const [doctors, setDoctors] = useState([]);
  // State เก็บรายชื่อคนไข้ทั้งหมด (สำหรับให้เลือกใน Modal)
  const [patients, setPatients] = useState([]);
  // State เช็คว่ากำลังโหลดข้อมูลอยู่ไหม
  const [isLoading, setIsLoading] = useState(true);

  // State สำหรับควบคุมการเปิด/ปิด Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State เช็คว่ากำลังบันทึกข้อมูลอยู่ไหม
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State เก็บข้อมูลจากฟอร์มสร้างทริป
  const [formData, setFormData] = useState({
    team_name: '',
    lead_doctor_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '12:00',
    patient_ids: [] // เก็บเป็น Array เพราะ 1 ทริปมีคนไข้ได้หลายคน
  });

  // ฟังก์ชันดึงข้อมูลทริปเยี่ยมบ้านทั้งหมด
  const fetchVisits = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5002/api/home-visits');
      if (res.data.success) {
        setVisits(res.data.data);
      }
    } catch (error) {
      console.error("ดึงข้อมูลทริปเยี่ยมบ้านไม่สำเร็จ:", error);
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
        // ถ้ามีแพทย์ในระบบ ให้เลือกแพทย์คนแรกเป็นค่าเริ่มต้น
        if (res.data.data.length > 0) {
          setFormData(prev => ({ ...prev, lead_doctor_id: res.data.data[0].id.toString() }));
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
        // ถ้าเลือกอยู่แล้วให้เอาออก
        return { ...prev, patient_ids: prev.patient_ids.filter(id => id !== patientId) };
      } else {
        // ถ้ายังไม่เลือกให้เพิ่มเข้าไป
        return { ...prev, patient_ids: [...prev.patient_ids, patientId] };
      }
    });
  };

  // ฟังก์ชันบันทึกการสร้างทริปใหม่
  const handleCreateVisit = async (e) => {
    e.preventDefault();
    // เช็คว่ากรอกข้อมูลจำเป็นครบไหม
    if (!formData.team_name || !formData.lead_doctor_id || formData.patient_ids.length === 0) {
      alert("กรุณากรอกชื่อทีม, เลือกแพทย์ และเลือกคนไข้อย่างน้อย 1 คน");
      return;
    }

    setIsSubmitting(true);
    try {
      // แปลงวันที่และเวลาให้อยู่ในฟอร์แมตที่ Database ต้องการ
      const startDateTime = `${formData.visit_date} ${formData.start_time}:00`;
      const endDateTime = `${formData.visit_date} ${formData.end_time}:00`;

      const res = await axios.post('http://localhost:5002/api/home-visits', {
        team_name: formData.team_name,
        lead_doctor_id: parseInt(formData.lead_doctor_id),
        visit_date: formData.visit_date,
        start_time: startDateTime,
        end_time: endDateTime,
        patient_ids: formData.patient_ids // ส่ง Array ของ ID คนไข้ไป
      });

      if (res.data.success) {
        alert('สร้างทริปเยี่ยมบ้านสำเร็จ!');
        setIsModalOpen(false);
        // ล้างข้อมูลในฟอร์ม (เหลือแค่วันที่และเวลาไว้)
        setFormData(prev => ({
          ...prev,
          team_name: '',
          patient_ids: []
        }));
        fetchVisits(); // รีเฟรชรายการทริป
      }
    } catch (error) {
      console.error("สร้างทริปไม่สำเร็จ:", error);
      alert('เกิดข้อผิดพลาดในการสร้างทริป');
    } finally {
      setIsSubmitting(false);
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
        fetchVisits(); // รีเฟรชข้อมูลเพื่อให้ UI อัปเดต
      }
    } catch (error) {
      console.error("อัปเดตสถานะไม่สำเร็จ:", error);
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  // ฟังก์ชันยกเลิกทริปทั้งทริป
  const handleCancelVisit = async (id) => {
    if (!window.confirm('คุณต้องการยกเลิกทริปเยี่ยมบ้านนี้ใช่หรือไม่?')) return;
    try {
      const res = await axios.delete(`http://localhost:5002/api/home-visits/${id}`);
      if (res.data.success) {
        alert('ยกเลิกทริปสำเร็จ');
        fetchVisits();
      }
    } catch (error) {
      console.error("ยกเลิกทริปไม่สำเร็จ:", error);
      alert('ไม่สามารถยกเลิกทริปได้');
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

      {/* ส่วนหัวของหน้า และปุ่มสร้างทริป */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#00c0e8]/20">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <i className="bi bi-house-heart text-[#00c0e8]"></i> ตารางเยี่ยมบ้าน
          </h1>
          <p className="text-sm text-gray-500 mt-1">จัดการทีมแพทย์และคนไข้สำหรับการออกเยี่ยมบ้าน</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#00c0e8] text-white rounded-xl font-bold hover:bg-[#00a8cc] transition-colors shadow-lg shadow-[#00c0e8]/30 whitespace-nowrap"
        >
          <i className="bi bi-plus-lg mr-1"></i> สร้างทริปเยี่ยมบ้าน
        </button>
      </div>

      {/* พื้นที่แสดงรายการทริป */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-[#00c0e8]">
            <i className="bi bi-arrow-repeat animate-spin text-4xl"></i>
          </div>
        ) : visits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <i className="bi bi-calendar-x text-6xl mb-4"></i>
            <p>ยังไม่มีรายการเยี่ยมบ้านในระบบ</p>
          </div>
        ) : (
          visits.map((visit) => (
            <div key={visit.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* หัวการ์ด: แสดงข้อมูลทีม วันที่ และปุ่มยกเลิก */}
              <div className="p-5 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-ivory/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00c0e8] text-white flex items-center justify-center shadow-md">
                    <i className="bi bi-truck text-xl"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-black flex items-center gap-2">
                      {visit.team_name}
                      {getStatusBadge(visit.status)}
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
                    <p className="text-sm font-semibold text-black">{visit.lead_doctor_name}</p>
                  </div>
                  {/* แสดงปุ่มยกเลิกเฉพาะทริปที่ยังไม่เสร็จหรือยังไม่ถูกยกเลิก */}
                  {visit.status !== 'cancelled' && visit.status !== 'completed' && (
                    <button
                      onClick={() => handleCancelVisit(visit.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition-colors"
                    >
                      ยกเลิกทริป
                    </button>
                  )}
                </div>
              </div>

              {/* รายละเอียดคนไข้ในทริป */}
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

                      {/* Dropdown สำหรับเปลี่ยนสถานะคนไข้รายคน */}
                      <select
                        value={patient.patient_status}
                        onChange={(e) => handleUpdatePatientStatus(visit.id, patient.patient_id, e.target.value)}
                        disabled={visit.status === 'cancelled'}
                        className={`text-xs font-bold px-2 py-1.5 rounded-lg border outline-none cursor-pointer ${patient.patient_status === 'visited' ? 'bg-green-50 text-green-700 border-green-200' :
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
          ))
        )}
      </div>

      {/* Modal สำหรับสร้างทริปเยี่ยมบ้านใหม่ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

            {/* หัวข้อ Modal */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold text-black flex items-center gap-2">
                <i className="bi bi-plus-circle text-[#00c0e8]"></i>
                สร้างทริปเยี่ยมบ้านใหม่
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            {/* ฟอร์มกรอกข้อมูล */}
            <form onSubmit={handleCreateVisit} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">

              {/* ช่องกรอกชื่อทีม */}
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

              {/* ช่องเลือกแพทย์หัวหน้า */}
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
                      {doc.gender === 'male' ? 'นพ.' : doc.gender === 'female' ? 'พญ.' : ''} {doc.first_name} {doc.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ช่องเลือกวันที่และเวลา */}
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

              {/* ส่วนเลือกคนไข้ (Multi-select) */}
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

              {/* ปุ่มยกเลิก และ บันทึก */}
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
                  className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors shadow-lg ${isSubmitting ? 'bg-gray-400' : 'bg-[#00c0e8] hover:bg-[#00a8cc] shadow-[#00c0e8]/30'
                    }`}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'สร้างทริป'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomeVisit;