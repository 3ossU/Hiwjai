import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// คำนวณอายุจากวันเดือนปีเกิด (YYYY-MM-DD หรือ ISO string) แบบแม่นยำตามเดือน/วัน
const calculateAgeFromBirthDate = (birthDateStr) => {
    if (!birthDateStr) return '';
    const datePart = String(birthDateStr).slice(0, 10);
    const parts = datePart.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return '';

    const [year, month, day] = parts;
    const birth = new Date(year, month - 1, day);
    if (Number.isNaN(birth.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age >= 0 ? age : '';
};

const AddUser = ({ user }) => {
    // ตัวแปรสำหรับเปลี่ยนหน้า
    const navigate = useNavigate();

    // State สำหรับเช็คว่ากำลังบันทึกข้อมูลอยู่ไหม และเก็บข้อความ Error (ถ้ามี)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // State สำหรับ Modal แจ้งเตือน (แทน alert)
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        type: 'success', // 'success' | 'error' | 'warning'
        title: '',
        message: '',
        redirectTo: null
    });

    // State หลักที่เก็บข้อมูลทั้งหมดจากฟอร์ม
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        avatar_url: '',
        hn: '',
        gender: 'female',
        birth_date: '',
        weight: '',
        height: '',
        blood_group: 'O',
        allergies: '',
        address: '',
        emergency_contact: ''
    });

    const showAlert = (type, title, message, redirectTo = null) => {
        setAlertModal({
            isOpen: true,
            type,
            title,
            message,
            redirectTo
        });
    };

    const handleCloseAlert = () => {
        const target = alertModal.redirectTo;
        setAlertModal(prev => ({ ...prev, isOpen: false, redirectTo: null }));
        if (target) {
            navigate(target);
        }
    };

    // ฟังก์ชันทำงานทุกครั้งที่มีการพิมพ์ในช่องกรอกข้อมูล
    const handleChange = (e) => {
        const { name, value } = e.target;
        // อัปเดตค่าลงใน State ตามชื่อช่อง (name) ที่เราพิมพ์
        setFormData(prev => ({ ...prev, [name]: value }));
        // พอเริ่มพิมพ์ใหม่ ให้ลบข้อความ Error เก่าออก
        setErrorMessage('');
    };

    // ฟังก์ชันทำงานเมื่อกดปุ่ม "บันทึกข้อมูลผู้ป่วย"
    const handleSubmit = async (e) => {
        e.preventDefault(); // ป้องกันไม่ให้หน้าเว็บรีเฟรชตอนกด Submit
        setErrorMessage('');

        // เช็คข้อมูลบังคับ (ที่มีดอกจันแดง) ว่ากรอกครบหรือยัง
        if (!formData.username || !formData.password || !formData.first_name || !formData.last_name || !formData.hn) {
            return setErrorMessage('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน');
        }

        setIsSubmitting(true);
        try {
            // ส่งข้อมูลไปที่ Backend (patient-service)
            const res = await axios.post('http://localhost:5004/api/patients', {
                ...formData,
                birth_date: formData.birth_date || null,
                // แปลงค่าตัวเลขให้เป็น Number ก่อนส่ง (ถ้ามีการกรอกมา)
                weight: formData.weight ? parseFloat(formData.weight) : null,
                height: formData.height ? parseFloat(formData.height) : null,
            });

            // ถ้าบันทึกสำเร็จ ให้เปิด Modal แจ้งเตือนและพากลับไปหน้าข้อมูลคนไข้
            if (res.data.success) {
                showAlert(
                    'success',
                    'เพิ่มผู้ป่วยใหม่สำเร็จ',
                    'สร้างบัญชีและบันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว',
                    '/nurse/patientinfos'
                );
            }
        } catch (error) {
            console.error("Error adding patient:", error);
            // ดึงข้อความ Error จาก Backend มาโชว์ (เช่น Username ซ้ำ)
            setErrorMessage(error.response?.data?.error || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล (อาจมี Username หรือ HN ซ้ำ)');
        } finally {
            setIsSubmitting(false); // ปิดสถานะกำลังบันทึก
        }
    };

    const calculatedAge = calculateAgeFromBirthDate(formData.birth_date);

    return (
        <div className="max-w-5xl mx-auto pb-10">

            {/* ส่วนหัวของหน้า พร้อมปุ่มย้อนกลับ */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                        <i className="bi bi-person-plus-fill text-[#00c0e8]"></i> เพิ่มผู้ป่วยใหม่
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">สร้างบัญชีและบันทึกข้อมูลเบื้องต้นให้ผู้ป่วย</p>
                </div>
                <Link to="/nurse/patientinfos" className="text-sm font-medium text-[#00c0e8] hover:underline flex items-center gap-1">
                    <i className="bi bi-arrow-left"></i> กลับหน้าข้อมูลผู้ป่วย
                </Link>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* ฝั่งซ้าย: การ์ดพรีวิวโปรไฟล์ (จะเปลี่ยนตามข้อมูลที่พิมพ์) */}
                <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-[#00c0e8]/20 sticky top-24">
                    <div className="text-center">
                        <div className="relative inline-block">
                            {/* ถ้ามีการใส่ URL รูป ก็จะโชว์รูปนั้น ถ้าไม่มีก็ใช้รูปสุ่มจาก DiceBear */}
                            <img
                                src={formData.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Nurse"}
                                alt="avatar preview"
                                className="w-32 h-32 rounded-full object-cover border-4 border-[#00c0e8]/20 shadow-inner mx-auto bg-gray-50"
                            />
                            <div className="absolute bottom-1 right-1 bg-white p-1.5 rounded-full shadow-sm">
                                <i className="bi bi-camera-fill text-gray-400 text-sm"></i>
                            </div>
                        </div>
                        {/* แสดงชื่อที่พิมพ์แบบ Real-time */}
                        <h3 className="mt-4 font-bold text-lg text-black">
                            {formData.first_name || 'ชื่อ'} {formData.last_name || 'นามสกุล'}
                        </h3>
                        <p className="text-sm text-[#00c0e8] font-semibold bg-[#00c0e8]/10 inline-block px-3 py-1 rounded-full mt-2">
                            HN: {formData.hn || '---'}
                        </p>
                        {calculatedAge !== '' && (
                            <p className="text-xs text-gray-500 mt-2">
                                อายุ: <span className="font-semibold text-gray-700">{calculatedAge} ปี</span>
                            </p>
                        )}
                    </div>

                    {/* ช่องกรอก URL รูปโปรไฟล์ */}
                    <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                                <i className="bi bi-image text-[#00c0e8]"></i> URL รูปโปรไฟล์ (ถ้ามี)
                            </label>
                            <input
                                type="url"
                                name="avatar_url"
                                value={formData.avatar_url}
                                onChange={handleChange}
                                placeholder="https://example.com/pic.jpg"
                                className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-xs"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                - ถ้าไม่ใส่ระบบจะใช้รูปสุ่มให้
                            </p>
                        </div>
                    </div>
                </div>

                {/* ฝั่งขวา: ฟอร์มกรอกข้อมูล แบ่งเป็น 3 ส่วน */}
                <div className="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-[#00c0e8]/20 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

                        {/* ส่วนที่ 1: ข้อมูลบัญชี */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#00c0e8] text-white flex items-center justify-center text-xs font-bold">1</div>
                                <h3 className="text-lg font-bold text-black">ข้อมูลบัญชีผู้ใช้</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-8">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                                    <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="เช่น pat_somchai" className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสผ่าน <span className="text-red-500">*</span></label>
                                    <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="กำหนดรหัสผ่าน" className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" required />
                                </div>
                            </div>
                        </div>

                        {/* ส่วนที่ 2: ข้อมูลส่วนตัว */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#00c0e8] text-white flex items-center justify-center text-xs font-bold">2</div>
                                <h3 className="text-lg font-bold text-black">ข้อมูลส่วนตัว</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-8">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อจริง <span className="text-red-500">*</span></label>
                                    <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">นามสกุล <span className="text-red-500">*</span></label>
                                    <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">HN (Hospital Number) <span className="text-red-500">*</span></label>
                                    <input type="text" name="hn" value={formData.hn} onChange={handleChange} placeholder="เช่น HN015" className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">เพศ <span className="text-red-500">*</span></label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm">
                                        <option value="female">หญิง</option>
                                        <option value="male">ชาย</option>
                                        <option value="other">อื่นๆ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        วันเดือนปีเกิด {calculatedAge !== '' ? `(อายุ ${calculatedAge} ปี)` : ''}
                                    </label>
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value={formData.birth_date}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                    <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่</label>
                                    <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm resize-none"></textarea>
                                </div>
                            </div>
                        </div>

                        {/* ส่วนที่ 3: ข้อมูลสุขภาพ */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#00c0e8] text-white flex items-center justify-center text-xs font-bold">3</div>
                                <h3 className="text-lg font-bold text-black">ข้อมูลสุขภาพ</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-8">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">น้ำหนัก (กก.)</label>
                                    <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">ส่วนสูง (ซม.)</label>
                                    <input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">กรุ๊ปเลือด</label>
                                    <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm">
                                        <option value="O">O</option>
                                        <option value="O-">O-</option>
                                        <option value="O+">O+</option>
                                        <option value="A">A</option>
                                        <option value="A-">A-</option>
                                        <option value="A+">A+</option>
                                        <option value="B">B</option>
                                        <option value="B-">B-</option>
                                        <option value="B+">B+</option>
                                        <option value="AB">AB</option>
                                        <option value="AB-">AB-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="UNKNOWN">UNKNOWN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์ติดต่อฉุกเฉิน</label>
                                    <input type="text" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">ประวัติการแพ้ยา / อาหาร</label>
                                    <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows="2" placeholder="ถ้าไม่มีให้เว้นว่างไว้" className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm resize-none"></textarea>
                                </div>
                            </div>
                        </div>

                        {/* แสดงกล่อง Error ถ้ามีปัญหาในการบันทึก */}
                        {errorMessage && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {errorMessage}
                            </div>
                        )}

                        {/* ปุ่มกดยกเลิก และ บันทึก */}
                        <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                            <button type="button" onClick={() => navigate('/nurse/patientinfos')} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                ยกเลิก
                            </button>
                            <button type="submit" disabled={isSubmitting} className={`px-8 py-3 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${isSubmitting ? 'bg-gray-400' : 'bg-[#00c0e8] hover:bg-[#00a8cc] shadow-[#00c0e8]/30'}`}>
                                {isSubmitting ? (
                                    <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังบันทึก...</>
                                ) : (
                                    <><i className="bi bi-check-lg"></i> บันทึกข้อมูลผู้ป่วย</>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>

            {/* Modal แจ้งเตือนผลลัพธ์ (แทน alert) */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 md:pl-64">
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
                            onClick={handleCloseAlert}
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

export default AddUser;