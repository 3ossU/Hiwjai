import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ApproveLeave = () => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [historyLeaves, setHistoryLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // State สำหรับ Modal ยืนยันและแจ้งเตือนผลลัพธ์
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    status: null,
    title: '',
    message: '',
  });
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'success', // 'success' | 'error'
    title: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        axios.get('http://localhost:5003/api/leaves/pending/all'),
        axios.get('http://localhost:5003/api/leaves/history/all')
      ]);

      if (pendingRes.data.success) setPendingLeaves(pendingRes.data.data);
      if (historyRes.data.success) setHistoryLeaves(historyRes.data.data);
      
    } catch (error) {
      console.error("ดึงข้อมูลไม่สำเร็จ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // เปิด Modal ยืนยันก่อนอัปเดตสถานะใบลา
  const handleUpdateStatus = (id, status) => {
    const isApprove = status === 'approved';
    setConfirmModal({
      isOpen: true,
      id,
      status,
      title: isApprove ? 'ยืนยันการอนุมัติใบลา' : 'ยืนยันการปฏิเสธใบลา',
      message: isApprove
        ? 'ยืนยันการอนุมัติใบลานี้? ระบบจะอัปเดตสถานะและย้ายรายการไปยังประวัติ'
        : 'ยืนยันการปฏิเสธใบลานี้? ระบบจะอัปเดตสถานะและย้ายรายการไปยังประวัติ',
    });
  };

  // ดำเนินการส่งคำขออัปเดตสถานะเมื่อกดยืนยันใน Modal
  const confirmUpdateStatus = async () => {
    const { id, status } = confirmModal;
    if (!id || !status) return;

    setIsSubmitting(true);
    try {
      const res = await axios.patch(`http://localhost:5003/api/leaves/${id}/status`, { status });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      if (res.data.success) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'ทำรายการสำเร็จ',
          message:
            status === 'approved'
              ? 'อนุมัติใบลาเรียบร้อยแล้วครับ'
              : 'บันทึกการปฏิเสธใบลาเรียบร้อยแล้วครับ',
        });
        fetchData();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'ทำรายการไม่สำเร็จ',
          message: res.data.message || 'เกิดข้อผิดพลาด',
        });
      }
    } catch (error) {
      console.error("อัปเดตสถานะไม่สำเร็จ:", error);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาด',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLeaveTypeText = (type) => {
    const types = { sick: 'ลาป่วย', personal: 'ลากิจ', annual: 'ลาพักร้อน', maternity: 'ลาคลอด' };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 flex items-center gap-1"><i className="bi bi-check-circle-fill"></i> อนุมัติแล้ว</span>;
    if (status === 'rejected') return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 flex items-center gap-1"><i className="bi bi-x-circle-fill"></i> ไม่อนุมัติ</span>;
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[#00c0e8]">
        <i className="bi bi-arrow-repeat animate-spin text-4xl"></i>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      
      {/* Header & Tabs */}
      <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-[#00c0e8]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sticky top-4 z-10">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <i className="bi bi-file-earmark-check-fill text-[#00c0e8]"></i> จัดการใบลา
          </h1>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบและอนุมัติใบลาของพยาบาลในระบบ</p>
        </div>
        
        {/* Segmented Control Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'pending' 
                ? 'bg-white text-[#00c0e8] shadow-sm' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            รออนุมัติ 
            <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === 'pending' ? 'bg-[#00c0e8]/10 text-[#00c0e8]' : 'bg-gray-200 text-gray-500'}`}>
              {pendingLeaves.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'history' 
                ? 'bg-white text-[#00c0e8] shadow-sm' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            ประวัติ
            <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === 'history' ? 'bg-[#00c0e8]/10 text-[#00c0e8]' : 'bg-gray-200 text-gray-500'}`}>
              {historyLeaves.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        
        {/* ================= แท็บ: รออนุมัติ ================= */}
        {activeTab === 'pending' && (
          pendingLeaves.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              <i className="bi bi-check-circle text-6xl mb-4 opacity-50 text-green-400"></i>
              <h3 className="text-lg font-bold text-gray-600 mb-1">เคลียร์หมดแล้ว!</h3>
              <p>ไม่มีใบลาที่รอการอนุมัติในขณะนี้</p>
            </div>
          ) : (
            pendingLeaves.map((leave) => (
              <div key={leave.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                
                {/* แถบสีด้านซ้ายบอกสถานะ */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00c0e8]"></div>

                <div className="flex items-start gap-5 w-full md:w-auto pl-2">
                  <img 
                    src={leave.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.first_name}`} 
                    alt="avatar" 
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#00c0e8]/20 shrink-0 shadow-sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-black">
                        {leave.first_name} {leave.last_name}
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                        {leave.role === 'nurse' ? 'พยาบาล' : leave.role}
                      </span>
                    </div>
                    <p className="font-bold text-[#00c0e8] flex items-center gap-1.5">
                      <i className="bi bi-tag-fill"></i> {getLeaveTypeText(leave.leave_type)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                      <i className="bi bi-calendar3"></i>
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2 italic bg-gray-50 p-2 rounded-lg border border-gray-100">"{leave.reason}"</p>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <button 
                    onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                    className="flex-1 md:flex-none px-5 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <i className="bi bi-x-lg"></i> ไม่อนุมัติ
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(leave.id, 'approved')}
                    className="flex-1 md:flex-none px-5 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-md shadow-green-500/30 flex items-center justify-center gap-1"
                  >
                    <i className="bi bi-check-lg"></i> อนุมัติ
                  </button>
                </div>

              </div>
            ))
          )
        )}

        {/* ================= แท็บ: ประวัติ ================= */}
        {activeTab === 'history' && (
          historyLeaves.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              <i className="bi bi-folder-x text-6xl mb-4 opacity-50"></i>
              <h3 className="text-lg font-bold text-gray-600 mb-1">ยังไม่มีประวัติ</h3>
              <p>เมื่อคุณอนุมัติหรือปฏิเสธใบลา รายการจะมาแสดงที่นี่</p>
            </div>
          ) : (
            historyLeaves.map((leave) => (
              <div key={leave.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                
                <div className="flex items-start gap-5 w-full md:w-auto">
                  <img 
                    src={leave.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.first_name}`} 
                    alt="avatar" 
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg text-black">
                        {leave.first_name} {leave.last_name}
                      </h3>
                      {getStatusBadge(leave.status)}
                    </div>
                    <p className="font-bold text-gray-700 flex items-center gap-1.5 mt-1">
                      <i className="bi bi-tag-fill text-gray-400"></i> {getLeaveTypeText(leave.leave_type)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                      <i className="bi bi-calendar3"></i>
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2 italic">"{leave.reason}"</p>
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0 pt-4 md:pt-0 w-full md:w-auto border-t md:border-t-0 border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ทำรายการเมื่อ</p>
                  <p className="text-sm font-semibold text-gray-600">
                    {formatDate(leave.created_at)}
                  </p>
                </div>

              </div>
            ))
          )
        )}

      </div>


      {/* Modal ยืนยันการอนุมัติ / ปฏิเสธ */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#00c0e8]/20 text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl ${
                confirmModal.status === 'approved'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              <i
                className={`bi ${
                  confirmModal.status === 'approved'
                    ? 'bi-question-circle-fill'
                    : 'bi-exclamation-triangle-fill'
                }`}
              ></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirmUpdateStatus}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-sm transition-colors shadow-md disabled:opacity-50 ${
                  confirmModal.status === 'approved'
                    ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                }`}
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แจ้งเตือนผลลัพธ์ (แทน alert) */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#00c0e8]/20 text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl ${
                alertModal.type === 'success'
                  ? 'bg-[#00c0e8]/15 text-[#00c0e8]'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              <i
                className={`bi ${
                  alertModal.type === 'success'
                    ? 'bi-check-circle-fill'
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

export default ApproveLeave;