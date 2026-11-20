import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Leave = ({ user }) => {
    // 👇 แก้ตรงนี้: ให้เช็คว่ามี user.id จริงๆ ถ้าไม่มีให้หยุดทำงาน
    const currentUserId = user?.id;

    // State เก็บข้อมูลจากฟอร์มขอลา
    const [formData, setFormData] = useState({
        leave_type: 'sick',
        start_date: '',
        end_date: '',
        reason: ''
    });

    // State เก็บประวัติการลา
    const [leaveHistory, setLeaveHistory] = useState([]);
    // State เช็คว่ากำลังส่งข้อมูลอยู่ไหม
    const [isSubmitting, setIsSubmitting] = useState(false);
    // State เช็คว่ากำลังโหลดประวัติอยู่ไหม
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    // State ควบคุมการเปิด/ปิด Modal แจ้งเตือนสำเร็จ
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    // State เก็บข้อความ Error
    const [errorMessage, setErrorMessage] = useState('');

    // ฟังก์ชันดึงประวัติการลาของพยาบาลคนนี้
    const fetchLeaveHistory = async () => {
        // 👇 ถ้าไม่มี currentUserId ให้หยุดโหลดเลย (กันดึงข้อมูลผิดคน)
        if (!currentUserId) {
            setIsLoadingHistory(false);
            return;
        }

        setIsLoadingHistory(true);
        try {
            const response = await axios.get(`http://localhost:5003/api/leaves/${currentUserId}`);
            if (response.data.success) {
                setLeaveHistory(response.data.data);
            }
        } catch (error) {
            console.error("ดึงประวัติการลาไม่สำเร็จ:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // โหลดประวัติทันทีที่เข้าหน้า (และเมื่อ currentUserId เปลี่ยน)
    useEffect(() => {
        fetchLeaveHistory();
    }, [currentUserId]);

    // ... (ส่วนที่เหลือเหมือนเดิมเป๊ะๆ) ...

    // ฟังก์ชันอัปเดตค่าฟอร์มเมื่อมีการพิมพ์
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrorMessage('');
    };

    // ฟังก์ชันเมื่อกดปุ่มส่งใบลา
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        // 👇 ถ้าไม่มี currentUserId ไม่ให้ส่ง
        if (!currentUserId) {
            return setErrorMessage('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
        }

        // เช็คว่ากรอกข้อมูลครบไหม
        if (!formData.start_date || !formData.end_date || !formData.reason) {
            return setErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);

        // เช็คว่าวันสิ้นสุดไม่น้อยกว่าวันเริ่ม
        if (end < start) {
            return setErrorMessage('วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น');
        }

        // คำนวณว่าลาล่วงหน้าอย่างน้อย 1 เดือนหรือไม่
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneMonthFromNow = new Date(today);
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

        if (start < oneMonthFromNow) {
            return setErrorMessage('ระบบกำหนดให้ต้องส่งใบลาล่วงหน้าอย่างน้อย 1 เดือนครับ');
        }

        setIsSubmitting(true);
        try {
            // ส่งข้อมูลใบลาไปที่ Backend
            const response = await axios.post('http://localhost:5003/api/leaves', {
                user_id: currentUserId,
                leave_type: formData.leave_type,
                start_date: formData.start_date,
                end_date: formData.end_date,
                reason: formData.reason
            });

            if (response.data.success) {
                setShowSuccessModal(true);
                setFormData({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
                fetchLeaveHistory(); // รีเฟรชประวัติ
            } else {
                setErrorMessage(response.data.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.error || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ฟังก์ชันแปลงประเภทการลาเป็นภาษาไทย
    const getLeaveTypeText = (type) => {
        const types = { sick: 'ลาป่วย', personal: 'ลากิจ', annual: 'ลาพักร้อน', maternity: 'ลาคลอด' };
        return types[type] || type;
    };

    // ฟังก์ชันเลือกสีของป้ายสถานะ
    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">อนุมัติแล้ว</span>;
            case 'rejected': return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">ไม่อนุมัติ</span>;
            default: return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">รอดำเนินการ</span>;
        }
    };

    return (
        <div className="max-w-6xl mx-auto flex flex-col xl:flex-row gap-6">

            {/* ฝั่งซ้าย: ฟอร์มขอลา */}
            <div className="w-full xl:w-3/5">
                <div className="bg-white rounded-2xl shadow-sm border border-[#00c0e8]/20 overflow-hidden">

                    {/* หัวข้อฟอร์ม */}
                    <div className="bg-[#00c0e8]/5 p-6 border-b border-[#00c0e8]/10">
                        <h1 className="text-2xl font-bold text-black flex items-center gap-3">
                            <i className="bi bi-calendar-x text-[#00c0e8]"></i>
                            ส่งใบลา (Leave Request)
                        </h1>
                        <p className="text-sm text-gray-500 mt-2">
                            * ระบบกำหนดให้ต้องยื่นใบลาล่วงหน้าอย่างน้อย 1 เดือน
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* เลือกประเภทการลา */}
                        <div>
                            <label className="block text-sm font-semibold text-black mb-2">ประเภทการลา <span className="text-red-500">*</span></label>
                            <select
                                name="leave_type"
                                value={formData.leave_type}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                            >
                                <option value="sick">ลาป่วย (Sick Leave)</option>
                                <option value="personal">ลากิจ (Personal Leave)</option>
                                <option value="annual">ลาพักร้อน (Annual Leave)</option>
                                <option value="maternity">ลาคลอด (Maternity Leave)</option>
                            </select>
                        </div>

                        {/* เลือกวันที่เริ่มและสิ้นสุด */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">วันที่เริ่มลา <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                                />
                            </div>
                        </div>

                        {/* กรอกเหตุผลการลา */}
                        <div>
                            <label className="block text-sm font-semibold text-black mb-2">เหตุผลการลา <span className="text-red-500">*</span></label>
                            <textarea
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                rows="3"
                                placeholder="ระบุเหตุผลการลาของคุณ..."
                                className="w-full px-4 py-3 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm resize-none"
                            ></textarea>
                        </div>

                        {/* แสดงข้อความ Error ถ้ามี */}
                        {errorMessage && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {errorMessage}
                            </div>
                        )}

                        {/* ปุ่มส่งใบลา */}
                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-8 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00c0e8] hover:bg-[#00a8cc] shadow-lg shadow-[#00c0e8]/30'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังส่งข้อมูล...</>
                                ) : (
                                    <><i className="bi bi-send"></i> ส่งใบลา</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ฝั่งขวา: ประวัติการลา */}
            <div className="w-full xl:w-2/5">
                <div className="bg-white rounded-2xl shadow-sm border border-[#00c0e8]/20 overflow-hidden h-full flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <h2 className="text-xl font-bold text-black flex items-center gap-2">
                            <i className="bi bi-clock-history text-[#00c0e8]"></i>
                            ประวัติการลา
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-ivory/50">
                        {isLoadingHistory ? (
                            // ระหว่างรอโหลด
                            <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                                <i className="bi bi-arrow-repeat animate-spin text-2xl text-[#00c0e8] mb-2"></i>
                                กำลังโหลดประวัติ...
                            </div>
                        ) : leaveHistory.length === 0 ? (
                            // ถ้าไม่มีประวัติเลย
                            <div className="text-center text-gray-400 py-10">
                                <i className="bi bi-folder-x text-4xl mb-2"></i>
                                <p>ยังไม่มีประวัติการลา</p>
                            </div>
                        ) : (
                            // ถ้ามีประวัติ ให้วนลูปแสดง
                            leaveHistory.map((leave) => (
                                <div key={leave.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-bold text-[#00c0e8]">{getLeaveTypeText(leave.leave_type)}</p>
                                        {getStatusBadge(leave.status)}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                                        <i className="bi bi-calendar3 text-xs"></i>
                                        {new Date(leave.start_date).toLocaleDateString('th-TH')} - {new Date(leave.end_date).toLocaleDateString('th-TH')}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 italic">"{leave.reason}"</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal แจ้งเตือนเมื่อส่งใบลาสำเร็จ */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in-up">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="bi bi-check-circle-fill text-4xl text-green-500"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-black mb-2">ส่งใบลาสำเร็จ!</h3>
                        <p className="text-gray-500 mb-8">ระบบได้ทำการบันทึกใบลาของคุณเรียบร้อยแล้ว</p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full py-3 bg-[#00c0e8] text-white rounded-xl font-bold hover:bg-[#00a8cc] transition-colors"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Leave;