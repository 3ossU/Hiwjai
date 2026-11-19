import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BLOOD_GROUPS = [
  'O', 'O-', 'O+',
  'A', 'A-', 'A+',
  'B', 'B-', 'B+',
  'AB', 'AB-', 'AB+',
  'UNKNOWN',
];

const GENDER_FILTERS = [
  { key: 'all', label: 'ทั้งหมด', icon: 'bi-people' },
  { key: 'male', label: 'ชาย', icon: 'bi-gender-male' },
  { key: 'female', label: 'หญิง', icon: 'bi-gender-female' },
];

// แปลงค่าวันที่จาก DB / API ให้เป็นรูปแบบ YYYY-MM-DD สำหรับ input type="date"
const toDateInputValue = (dateVal) => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// คำนวณอายุจากวันเดือนปีเกิดแบบแม่นยำตามเดือน/วัน
const calculateAgeFromBirthDate = (birthDateVal) => {
  const dateStr = toDateInputValue(birthDateVal);
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;

  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
};

// แกะ JSON/string ที่อาจซ้อนหลายชั้น ให้เหลือ Array ของ Object [{ name }] (ไม่เอา note)
const normalizeAllergiesObjects = (allergies) => {
  if (!allergies) return [];

  let current = allergies;

  for (let i = 0; i < 3; i += 1) {
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (
        !trimmed ||
        trimmed === '-' ||
        trimmed === 'ไม่มี' ||
        trimmed === 'ไม่มีประวัติการแพ้' ||
        trimmed === '[]'
      ) {
        return [];
      }
      try {
        current = JSON.parse(trimmed);
      } catch {
        break;
      }
    } else {
      break;
    }
  }

  if (!Array.isArray(current)) {
    if (typeof current === 'string') {
      const cleaned = current.replace(/^\[|\]$/g, '').trim();
      if (!cleaned || cleaned === '-' || cleaned === 'ไม่มี') return [];
      return cleaned
        .split(',')
        .map((s) => s.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    }
    if (current && typeof current === 'object') {
      const name = String(current.name || current.allergen || current.label || '').trim();
      return name ? [{ name }] : [];
    }
    return [];
  }

  return current
    .map((item) => {
      let inner = item;
      for (let i = 0; i < 2; i += 1) {
        if (typeof inner === 'string') {
          const t = inner.trim();
          if (t.startsWith('{') || t.startsWith('[')) {
            try {
              inner = JSON.parse(t);
              continue;
            } catch {
              // ใช้ค่า string เดิม
            }
          }
          const cleanName = t.replace(/^["']|["']$/g, '').trim();
          return cleanName ? { name: cleanName } : null;
        }
        break;
      }

      if (inner && typeof inner === 'object') {
        const name = String(inner.name || inner.allergen || inner.label || '').trim();
        return name ? { name } : null;
      }
      return null;
    })
    .filter(Boolean);
};

// แสดงผลเป็นข้อความคั่นด้วย ", " สวยๆ ไม่มี [{}] และไม่มี note
const formatAllergiesText = (allergies) => {
  const list = normalizeAllergiesObjects(allergies);
  if (list.length === 0) return 'ไม่มีประวัติการแพ้';
  return list.map((item) => item.name).join(', ');
};

// จัดรูปแบบเบอร์ติดต่อฉุกเฉิน + ความสัมพันธ์ เช่น "081-111-1103 (มารดา)"
const formatEmergencyContactText = (contact, relation) => {
  const phone = String(contact || '').trim();
  const rel = String(relation || '').trim();
  if (!phone && !rel) return '-';
  if (phone && rel) return `${phone} (${rel})`;
  return phone || `(${rel})`;
};

const PatientInfos = ({ user }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [allergiesList, setAllergiesList] = useState([]);
  const [newAllergyName, setNewAllergyName] = useState('');

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const fetchPatients = async (search = '') => {
    setIsLoading(true);
    try {
      const url = search 
        ? `http://localhost:5004/api/patients?search=${search}` 
        : 'http://localhost:5004/api/patients';
      
      const response = await axios.get(url);
      const result = response.data; 
      
      if (result.success) {
        setPatients(result.data);
        if (!selectedPatient && result.data.length > 0) {
          handleSelectPatient(result.data[0].id);
        }
      }
    } catch (error) {
      console.error("ดึงข้อมูลคนไข้ไม่สำเร็จ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPatient = async (id) => {
    setIsDetailLoading(true);
    try {
      const response = await axios.get(`http://localhost:5004/api/patients/${id}`);
      const result = response.data;
      
      if (result.success) {
        setSelectedPatient(result.data);
      }
    } catch (error) {
      console.error("ดึงข้อมูลรายละเอียดคนไข้ไม่สำเร็จ:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const filteredPatients = patients.filter((patient) => {
    if (genderFilter === 'all') return true;
    return String(patient.gender || '').toLowerCase() === genderFilter;
  });

  const handleOpenEditModal = () => {
    setEditFormData({
      ...selectedPatient,
      birth_date: toDateInputValue(selectedPatient?.birth_date),
    });
    setAllergiesList(normalizeAllergiesObjects(selectedPatient?.allergies));
    setNewAllergyName('');
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAllergy = () => {
    const name = newAllergyName.trim();
    if (!name) return;

    setAllergiesList((prev) => {
      const exists = prev.some((item) => item.name.toLowerCase() === name.toLowerCase());
      if (exists) return prev;
      return [...prev, { name }];
    });

    setNewAllergyName('');
  };

  const handleRemoveAllergy = (indexToRemove) => {
    setAllergiesList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    const pendingName = newAllergyName.trim();
    const finalAllergiesArray = [...allergiesList];
    if (pendingName && !finalAllergiesArray.some((i) => i.name.toLowerCase() === pendingName.toLowerCase())) {
      finalAllergiesArray.push({ name: pendingName });
    }

    try {
      const res = await axios.put(`http://localhost:5004/api/patients/${selectedPatient.id}`, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone_number: editFormData.phone_number,
        avatar_url: editFormData.avatar_url,
        gender: editFormData.gender,
        birth_date: editFormData.birth_date || null,
        weight: editFormData.weight,
        height: editFormData.height,
        blood_group: editFormData.blood_group,
        allergies: finalAllergiesArray,
        address: editFormData.address,
        emergency_contact: editFormData.emergency_contact,
        emergency_contact_relation: editFormData.emergency_contact_relation,
      });

      if (res.data.success) {
        setIsEditModalOpen(false);
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'บันทึกสำเร็จ',
          message: 'อัปเดตข้อมูลผู้ป่วยสำเร็จ!',
        });
        handleSelectPatient(selectedPatient.id);
        fetchPatients(searchTerm);
      }
    } catch (error) {
      console.error("อัปเดตข้อมูลไม่สำเร็จ:", error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedPatientAge = selectedPatient ? calculateAgeFromBirthDate(selectedPatient.birth_date) : null;
  const editFormAge = calculateAgeFromBirthDate(editFormData.birth_date);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      
      {/* ฝั่งซ้าย: รายชื่อคนไข้ ช่องค้นหา และฟิลเตอร์เพศ */}
      <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-[#00c0e8]/20 flex flex-col overflow-hidden">
        
        <div className="p-5 border-b border-[#00c0e8]/10 space-y-3">
          <h2 className="text-xl font-bold text-black flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00c0e8]/10 flex items-center justify-center text-[#00c0e8] shrink-0">
              <i className="bi bi-people-fill text-lg"></i>
            </div>
            รายชื่อผู้ป่วย
          </h2>

          <div className="relative">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ, นามสกุล, หรือ HN..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-ivory border border-[#00c0e8]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
            />
          </div>

          {/* ฟิลเตอร์แยก ชาย - หญิง */}
          <div className="grid grid-cols-3 gap-1.5 bg-ivory p-1 rounded-xl border border-[#00c0e8]/20">
            {GENDER_FILTERS.map((item) => {
              const isActive = genderFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGenderFilter(item.key)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-[#00c0e8] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white/80 hover:text-black'
                  }`}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {isLoading ? (
            <div className="text-center text-gray-500 py-10 flex flex-col items-center gap-2">
              <i className="bi bi-arrow-repeat animate-spin text-2xl text-[#00c0e8]"></i>
              กำลังโหลดข้อมูล...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center text-gray-500 py-10">ไม่พบข้อมูลผู้ป่วย</div>
          ) : (
            filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => handleSelectPatient(patient.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                  selectedPatient?.id === patient.id
                    ? 'bg-[#00c0e8]/5 border-[#00c0e8] shadow-sm'
                    : 'bg-white border-transparent hover:bg-gray-50'
                }`}
              >
                <img 
                  src={patient.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.hn}`} 
                  alt="avatar" 
                  className={`w-12 h-12 rounded-full object-cover border-2 ${selectedPatient?.id === patient.id ? 'border-[#00c0e8]' : 'border-gray-200'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm truncate ${selectedPatient?.id === patient.id ? 'text-[#00c0e8]' : 'text-black'}`}>
                    {patient.first_name} {patient.last_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">HN: {patient.hn}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ฝั่งขวา: รายละเอียดของคนไข้ที่ถูกเลือก */}
      <div className="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-[#00c0e8]/20 flex flex-col overflow-hidden relative">
        {isDetailLoading ? (
          <div className="flex-1 flex items-center justify-center text-[#00c0e8]">
            <i className="bi bi-arrow-repeat animate-spin text-4xl"></i>
          </div>
        ) : selectedPatient ? (
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            
            <div className="p-8 pb-6 border-b border-[#00c0e8]/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c0e8]/5 rounded-bl-full -z-10"></div>
              
              <div className="flex items-start gap-6 relative z-10">
                <img 
                  src={selectedPatient.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.hn}`} 
                  alt="avatar" 
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-md shrink-0"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-black mb-2">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h1>
                      <p className="text-[#00c0e8] font-semibold bg-[#00c0e8]/10 inline-block px-3 py-1 rounded-full text-sm">
                        HN: {selectedPatient.hn}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        selectedPatient.gender === 'male' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        selectedPatient.gender === 'female' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {selectedPatient.gender === 'male' ? 'ผู้ป่วยชาย' : selectedPatient.gender === 'female' ? 'ผู้ป่วยหญิง' : 'อื่นๆ'}
                      </span>
                      
                      <button 
                        onClick={handleOpenEditModal}
                        className="px-4 py-1.5 bg-[#00c0e8] text-white rounded-full text-xs font-bold hover:bg-[#00a8cc] transition-colors shadow-sm flex items-center gap-1"
                      >
                        <i className="bi bi-pencil-square"></i> แก้ไข
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 mt-6 text-sm">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-[#00c0e8]">
                        <i className="bi bi-telephone text-sm"></i>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium">เบอร์ติดต่อส่วนตัว</p>
                        <p className="font-medium">{selectedPatient.phone_number || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-red-500">
                        <i className="bi bi-telephone-plus text-sm"></i>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium">เบอร์ติดต่อฉุกเฉิน</p>
                        <p className="font-medium">
                          {formatEmergencyContactText(
                            selectedPatient.emergency_contact,
                            selectedPatient.emergency_contact_relation
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700 md:col-span-2">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-[#00c0e8]">
                        <i className="bi bi-geo-alt text-sm"></i>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium">ที่อยู่</p>
                        <p className="font-medium">{selectedPatient.address || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <h3 className="font-bold text-lg text-black border-b border-gray-100 pb-3">ข้อมูลสุขภาพเบื้องต้น</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center hover:border-[#00c0e8]/30 transition-colors">
                  <p className="text-xs text-gray-500 mb-1">อายุ</p>
                  {selectedPatientAge !== null ? (
                    <p className="font-bold text-lg text-black">
                      {selectedPatientAge} <span className="text-sm font-normal text-gray-500">ปี</span>
                    </p>
                  ) : (
                    <p className="font-bold text-lg text-black">-</p>
                  )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center hover:border-[#00c0e8]/30 transition-colors">
                  <p className="text-xs text-gray-500 mb-1">น้ำหนัก</p>
                  <p className="font-bold text-lg text-black">{selectedPatient.weight || '-'} <span className="text-sm font-normal text-gray-500">กก.</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center hover:border-[#00c0e8]/30 transition-colors">
                  <p className="text-xs text-gray-500 mb-1">ส่วนสูง</p>
                  <p className="font-bold text-lg text-black">{selectedPatient.height || '-'} <span className="text-sm font-normal text-gray-500">ซม.</span></p>
                </div>
                <div className="bg-[#00c0e8]/5 p-4 rounded-xl border border-[#00c0e8]/20 shadow-sm text-center">
                  <p className="text-xs text-[#00c0e8] font-semibold mb-1">กรุ๊ปเลือด</p>
                  <p className="font-bold text-xl text-[#00c0e8]">{selectedPatient.blood_group || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-red-50/50 p-5 rounded-xl border border-red-100 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="bi bi-exclamation-triangle-fill text-red-500 text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-red-600 mb-1 text-sm">ประวัติการแพ้ยา / อาหาร</h4>
                    <p className="text-gray-700 text-sm">
                      {formatAllergiesText(selectedPatient.allergies)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <i className="bi bi-person-x text-6xl mb-4"></i>
            <p>กรุณาเลือกผู้ป่วยจากรายชื่อด้านซ้าย</p>
          </div>
        )}
      </div>

      {/* Modal สำหรับแก้ไขข้อมูลผู้ป่วย */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 pl-64">
          <div className="bg-white rounded-3xl p-6 w-full max-w-5xl shadow-2xl my-8 flex flex-col relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-xl font-bold text-black flex items-center gap-2">
                <i className="bi bi-pencil-square text-[#00c0e8]"></i>
                แก้ไขข้อมูลผู้ป่วย
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleUpdatePatient} className="space-y-4">
              
              {/* จัดกลุ่มข้อมูลส่วนตัว */}
              <div>
                <h3 className="text-sm font-bold text-[#00c0e8] mb-3 border-b pb-1">ข้อมูลส่วนตัว</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อจริง</label>
                    <input
                      type="text"
                      name="first_name"
                      value={editFormData.first_name || ''}
                      readOnly
                      className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none text-sm cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">นามสกุล</label>
                    <input
                      type="text"
                      name="last_name"
                      value={editFormData.last_name || ''}
                      readOnly
                      className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none text-sm cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">เพศ</label>
                    <select
                      name="gender"
                      value={editFormData.gender || 'female'}
                      onMouseDown={(e) => e.preventDefault()}
                      onKeyDown={(e) => e.preventDefault()}
                      tabIndex={-1}
                      className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none text-sm cursor-not-allowed select-none pointer-events-none"
                    >
                      <option value="female">หญิง</option>
                      <option value="male">ชาย</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      วันเดือนปีเกิด {editFormAge !== null ? `(อายุ ${editFormAge} ปี)` : ''}
                    </label>
                    <input
                      type="date"
                      name="birth_date"
                      value={editFormData.birth_date || ''}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* จัดกลุ่มข้อมูลสุขภาพ */}
              <div>
                <h3 className="text-sm font-bold text-[#00c0e8] mb-3 border-b pb-1">ข้อมูลสุขภาพ</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">น้ำหนัก (กก.)</label>
                    <input type="number" step="0.1" name="weight" value={editFormData.weight || ''} onChange={handleEditChange} className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ส่วนสูง (ซม.)</label>
                    <input type="number" step="0.1" name="height" value={editFormData.height || ''} onChange={handleEditChange} className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">กรุ๊ปเลือด</label>
                    <select
                      name="blood_group"
                      value={editFormData.blood_group || 'O'}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                    >
                      {BLOOD_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group === 'UNKNOWN' ? 'UNKNOWN (ไม่ทราบ)' : group}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ประวัติการแพ้ยา / อาหาร</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="เพิ่มรายการแพ้ยา/อาหาร..."
                        value={newAllergyName}
                        onChange={(e) => setNewAllergyName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAllergy();
                          }
                        }}
                        className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddAllergy}
                        className="px-3 py-2 bg-[#00c0e8] text-white rounded-lg text-xs font-bold hover:bg-[#00a8cc] transition-colors shrink-0"
                      >
                        เพิ่ม
                      </button>
                    </div>
                    {allergiesList.length > 0 && (
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-gray-600 bg-ivory border border-[#00c0e8]/20 rounded-lg px-2.5 py-1.5">
                        <span className="truncate">
                          {allergiesList.map((item) => item.name).join(', ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergy(allergiesList.length - 1)}
                          className="text-red-500 hover:text-red-700 font-semibold shrink-0"
                        >
                          ลบตัวล่าสุด
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* จัดกลุ่มข้อมูลติดต่อ */}
              <div>
                <h3 className="text-sm font-bold text-[#00c0e8] mb-3 border-b pb-1">ข้อมูลการติดต่อ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                    <input type="text" name="phone_number" value={editFormData.phone_number || ''} onChange={handleEditChange} className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">เบอร์ติดต่อฉุกเฉิน</label>
                    <input type="text" name="emergency_contact" value={editFormData.emergency_contact || ''} onChange={handleEditChange} className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ความสัมพันธ์ผู้ติดต่อฉุกเฉิน</label>
                    <input
                      type="text"
                      name="emergency_contact_relation"
                      placeholder="เช่น มารดา, บิดา, คู่สมรส..."
                      value={editFormData.emergency_contact_relation || ''}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ที่อยู่</label>
                    <input type="text" name="address" value={editFormData.address || ''} onChange={handleEditChange} className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">URL รูปโปรไฟล์</label>
                    <input type="url" name="avatar_url" value={editFormData.avatar_url || ''} onChange={handleEditChange} className="w-full px-3 py-2 bg-ivory border border-[#00c0e8]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0e8]/50 text-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={isUpdating} className={`flex-1 py-2.5 text-white rounded-xl font-bold transition-colors shadow-lg ${isUpdating ? 'bg-gray-400' : 'bg-[#00c0e8] hover:bg-[#00a8cc] shadow-[#00c0e8]/30'}`}>
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal แจ้งเตือนผลลัพธ์ */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
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

export default PatientInfos;