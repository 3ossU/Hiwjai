
import { useState, useEffect } from 'react';
import { store } from '../../api';
import './Prescription.css';

function Prescription() {
    const apiUrl = 'http://localhost:3006';

    const [hasMedicine, setHasMedicine] = useState('yes');

    const emptyMedicine = {
        name: '',
        strength: '',
        dosage: '',
        route: 'รับประทาน',
        frequency: '',
        meal: 'หลังอาหาร',
        duration: '',
        quantity: '',
        instruction: '',
        medicineId: ''
    };

    const [medicines, setMedicines] = useState([
        { ...emptyMedicine }
    ]);

    // ค้นหาและเลือกผู้ป่วย
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // ประวัติใบสั่งยาเดิม
    const [prescriptionHistory, setPrescriptionHistory] = useState([]);
    const [expandedPrescription, setExpandedPrescription] = useState(null);

    // รายการยาจากฐานข้อมูล
    const [medicineCatalog, setMedicineCatalog] = useState([]);

    const [loadingMedicines, setLoadingMedicines] = useState(true);
    const [searching, setSearching] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');

    // ดึงรายการยาจากฐานข้อมูล
    useEffect(() => {
        const fetchMedicines = async () => {
            try {
                const token = store.token();

                if (!token) {
                    throw new Error('ไม่พบ Token กรุณาเข้าสู่ระบบใหม่');
                }

                const response = await fetch(
                    `${apiUrl}/api/prescriptions/medicines`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || 'ไม่สามารถดึงข้อมูลยาได้'
                    );
                }

                setMedicineCatalog(result.data || []);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoadingMedicines(false);
            }
        };

        fetchMedicines();
    }, []);

    // ค้นหาผู้ป่วย
    const searchPatients = async (e) => {
        e.preventDefault();

        if (!search.trim()) {
            setPatients([]);
            return;
        }

        try {
            setSearching(true);
            setError('');

            const token = store.token();

            const response = await fetch(
                `${apiUrl}/api/prescriptions/patients?q=${encodeURIComponent(search)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || 'ค้นหาผู้ป่วยไม่สำเร็จ'
                );
            }

            setPatients(result.data || []);

        } catch (err) {
            setError(err.message);
            setPatients([]);
        } finally {
            setSearching(false);
        }
    };

    // เลือกผู้ป่วยและดึงประวัติใบสั่งยา
    const selectPatient = async (patient) => {
        try {
            setSelectedPatient(patient);
            setPatients([]);
            setPrescriptionHistory([]);
            setExpandedPrescription(null);
            setError('');
            setLoadingHistory(true);

            const token = store.token();

            const response = await fetch(
                `${apiUrl}/api/prescriptions/patient/${patient.user_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || 'ไม่สามารถดึงประวัติใบสั่งยาได้'
                );
            }

            setPrescriptionHistory(result.data || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingHistory(false);
        }
    };

    // เพิ่มรายการยา
    const addMedicine = () => {
        setMedicines(prev => [
            ...prev,
            { ...emptyMedicine }
        ]);
    };

    // ลบรายการยา
    const removeMedicine = (index) => {
        setMedicines(prev =>
            prev.filter((_, i) => i !== index)
        );
    };

    // แก้ไขข้อมูลยา
    const updateMedicine = (index, field, value) => {
        setMedicines(prev =>
            prev.map((medicine, i) =>
                i === index
                    ? { ...medicine, [field]: value }
                    : medicine
            )
        );
    };

    // เลือกยาจากฐานข้อมูล
    const selectMedicine = (index, medicineId) => {
        const selected = medicineCatalog.find(
            item => String(item.MedicineId) === String(medicineId)
        );

        setMedicines(prev =>
            prev.map((medicine, i) =>
                i === index
                    ? {
                        ...medicine,
                        medicineId: selected?.MedicineId || '',
                        name: selected?.MedicineName || '',
                        strength: selected?.Strength || ''
                    }
                    : medicine
            )
        );
    };

    // บันทึกใบสั่งยาและประวัติการรักษา
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedPatient) {
            alert('กรุณาเลือกผู้ป่วยก่อน');
            return;
        }

        // ตรวจสอบประวัติการรักษา
        if (
            !e.target.chiefComplaint.value.trim() &&
            !e.target.diagnosis.value.trim() &&
            !e.target.treatmentNote.value.trim()
        ) {
            alert('กรุณากรอกอาการสำคัญ การวินิจฉัย หรือรายละเอียดการรักษาอย่างน้อย 1 รายการ');
            return;
        }

        const medicineList = hasMedicine === 'yes'
            ? medicines
            : [];

        // รับค่าวันและเวลานัด
        const followUpDate = e.target.followUpDate.value;
        const followUpStartTime = e.target.followUpStartTime.value;
        const followUpEndTime = e.target.followUpEndTime.value;

        // ตรวจสอบเวลาเมื่อตั้งวันนัด
        if (followUpDate && (!followUpStartTime || !followUpEndTime)) {
            alert('กรุณาเลือกเวลาเริ่มนัดและเวลาสิ้นสุดนัด');
            return;
        }

        // ตรวจสอบลำดับเวลา
        if (followUpDate && followUpStartTime >= followUpEndTime) {
            alert('เวลาสิ้นสุดนัดต้องมากกว่าเวลาเริ่มนัด');
            return;
        }

        try {
            setSaving(true);
            setError('');

            const token = store.token();

            if (!token) {
                throw new Error('ไม่พบ Token กรุณาเข้าสู่ระบบใหม่');
            }

            // ข้อมูลที่จะส่งไป Backend
            const data = {
                user_id: selectedPatient.user_id,
                booking_id: null,

                // ประวัติการรักษา
                visit_date: e.target.visitDate.value,
                chief_complaint: e.target.chiefComplaint.value,
                diagnosis: e.target.diagnosis.value,
                treatment_note: e.target.treatmentNote.value,

                // วันและเวลานัดติดตาม
                follow_up_date: followUpDate || null,
                follow_up_start_time: followUpStartTime || null,
                follow_up_end_time: followUpEndTime || null,

                // ข้อมูลใบสั่งยา
                DoctorNote: e.target.doctorNote.value,
                Medicines: medicineList
            };

            const response = await fetch(
                `${apiUrl}/api/prescriptions`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || 'บันทึกใบสั่งยาไม่สำเร็จ'
                );
            }

            alert('บันทึกใบสั่งยาและประวัติการรักษาสำเร็จ');

            // ล้างข้อมูลฟอร์ม
            setHasMedicine('yes');
            setMedicines([{ ...emptyMedicine }]);
            e.target.reset();

            // โหลดประวัติใบสั่งยาใหม่
            await selectPatient(selectedPatient);

        } catch (err) {
            console.error('Save Prescription Error:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // แปลงวันที่
    const formatDate = (date) => {
        if (!date) return '-';

        const parsedDate = new Date(
            String(date).replace(' ', 'T')
        );

        if (isNaN(parsedDate.getTime())) return date;

        return parsedDate.toLocaleString('th-TH', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="prescription-page">

            <div className="prescription-heading">
                <div>
                    <h1>ฟอร์มสั่งยา</h1>
                    <p>ค้นหาผู้ป่วย ตรวจสอบประวัติ และสั่งยา</p>
                </div>
            </div>

            {/* ส่วนที่ 1 ค้นหาผู้ป่วย */}
            <section className="prescription-card">
                <h3>ค้นหาผู้ป่วย</h3>

                <form onSubmit={searchPatients}>
                    <div className="prescription-field">
                        <label>ค้นหาด้วย HN หรือชื่อผู้ป่วย</label>

                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="กรอก HN หรือชื่อผู้ป่วย"
                        />
                    </div>

                    <button type="submit" disabled={searching}>
                        {searching ? 'กำลังค้นหา...' : 'ค้นหาผู้ป่วย'}
                    </button>
                </form>

                {/* ผลการค้นหา */}
                {patients.length > 0 && (
                    <div className="patient-search-results">
                        <h4>ผลการค้นหา</h4>

                        {patients.map(patient => (
                            <div
                                key={patient.patient_id}
                                className="patient-search-item"
                                onClick={() => selectPatient(patient)}
                            >
                                <div>
                                    <strong>
                                        {patient.first_name} {patient.last_name}
                                    </strong>
                                    <p>HN: {patient.hn}</p>
                                </div>

                                <span>เลือกผู้ป่วย</span>
                            </div>
                        ))}
                    </div>
                )}

                {patients.length === 0 && search.trim() && !searching && (
                    <p className="prescription-hint">
                        ไม่พบผู้ป่วย หรือยังไม่ได้ค้นหา
                    </p>
                )}

                {/* ผู้ป่วยที่เลือก */}
                {selectedPatient && (
                    <div className="selected-prescription-patient">
                        <h4>ผู้ป่วยที่เลือก</h4>

                        <p>
                            <strong>ชื่อ:</strong>{' '}
                            {selectedPatient.first_name} {selectedPatient.last_name}
                        </p>

                        <p>
                            <strong>HN:</strong> {selectedPatient.hn}
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedPatient(null);
                                setPrescriptionHistory([]);
                                setPatients([]);
                                setSearch('');
                                setExpandedPrescription(null);
                            }}
                        >
                            เปลี่ยนผู้ป่วย
                        </button>
                    </div>
                )}
            </section>

            {error && (
                <p style={{ color: 'red' }}>{error}</p>
            )}

            {/* ส่วนที่ 2 ประวัติใบสั่งยาเดิม */}
            {selectedPatient && (
                <section className="prescription-card">
                    <h3>ประวัติการสั่งยาเดิม</h3>

                    {loadingHistory ? (
                        <p>กำลังโหลดประวัติใบสั่งยา...</p>
                    ) : prescriptionHistory.length === 0 ? (
                        <p className="prescription-hint">
                            ผู้ป่วยรายนี้ยังไม่มีประวัติการสั่งยา
                        </p>
                    ) : (
                        <div className="prescription-history-list">
                            {prescriptionHistory.map(item => (
                                <div
                                    className="prescription-history-item"
                                    key={item.PrescriptionId}
                                >
                                    <button
                                        type="button"
                                        className="prescription-history-toggle"
                                        onClick={() =>
                                            setExpandedPrescription(
                                                expandedPrescription === item.PrescriptionId
                                                    ? null
                                                    : item.PrescriptionId
                                            )
                                        }
                                    >
                                        <div>
                                            <strong>
                                                ใบสั่งยา #{item.PrescriptionId}
                                            </strong>

                                            <p>
                                                วันที่: {formatDate(item.PrescriptionDate)}
                                            </p>

                                            <p>
                                                {item.medicines?.length || 0} รายการยา
                                            </p>
                                        </div>

                                        <span>
                                            {expandedPrescription === item.PrescriptionId
                                                ? 'ซ่อนรายละเอียด ▲'
                                                : 'ดูรายละเอียด ▼'}
                                        </span>
                                    </button>

                                    {expandedPrescription === item.PrescriptionId && (
                                        <div className="prescription-history-detail">
                                            <p>
                                                <strong>หมายเหตุแพทย์:</strong>{' '}
                                                {item.DoctorNote || '-'}
                                            </p>

                                            <p>
                                                <strong>การวินิจฉัย:</strong>{' '}
                                                {item.Diagnosis || '-'}
                                            </p>

                                            <h4>รายการยาที่เคยได้รับ</h4>

                                            {item.medicines?.length > 0 ? (
                                                item.medicines.map((medicine, index) => (
                                                    <div
                                                        className="old-medicine-item"
                                                        key={medicine.MedicineId || index}
                                                    >
                                                        <strong>
                                                            {index + 1}. {medicine.MedicineName}
                                                        </strong>

                                                        <p>ความแรง: {medicine.Strength || '-'}</p>
                                                        <p>ขนาดยา: {medicine.Dosage || '-'}</p>
                                                        <p>วิธีใช้: {medicine.Route || '-'}</p>
                                                        <p>ความถี่: {medicine.Frequency || '-'}</p>
                                                        <p>ช่วงเวลา: {medicine.Meal || '-'}</p>
                                                        <p>ระยะเวลา: {medicine.Duration || '-'}</p>
                                                        <p>จำนวน: {medicine.Quantity || '-'}</p>
                                                        <p>คำแนะนำ: {medicine.Instructions || '-'}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p>ใบสั่งยานี้ไม่มีรายการยา</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* ส่วนที่ 3 ฟอร์มสั่งยาใหม่ */}
            <form onSubmit={handleSubmit}>

                {/* ประวัติการรักษาใหม่ */}
                {selectedPatient && (
                    <section className="prescription-card">
                        <h3>ประวัติการรักษา</h3>

                        <div className="prescription-grid">
                            <div className="prescription-field">
                                <label>วันที่เข้ารับการรักษา</label>
                                <input
                                    type="date"
                                    name="visitDate"
                                    defaultValue={new Date(
                                        Date.now() - new Date().getTimezoneOffset() * 60000
                                    ).toISOString().slice(0, 10)}
                                    required
                                />
                            </div>

                            <div className="prescription-field">
                                <label>วันนัดติดตาม</label>
                                <input
                                    type="date"
                                    name="followUpDate"
                                />
                            </div>

                            <div className="prescription-field">
                                <label>เวลาเริ่มนัด</label>
                                <input
                                    type="time"
                                    name="followUpStartTime"
                                />
                            </div>

                            <div className="prescription-field">
                                <label>เวลาสิ้นสุดนัด</label>
                                <input
                                    type="time"
                                    name="followUpEndTime"
                                />
                            </div>

                            <div className="prescription-field full-width">
                                <label>อาการสำคัญ</label>
                                <textarea
                                    name="chiefComplaint"
                                    placeholder="ระบุอาการสำคัญของผู้ป่วย"
                                />
                            </div>

                            <div className="prescription-field full-width">
                                <label>การวินิจฉัย</label>
                                <textarea
                                    name="diagnosis"
                                    placeholder="ระบุผลการวินิจฉัย"
                                />
                            </div>

                            <div className="prescription-field full-width">
                                <label>รายละเอียดการรักษา</label>
                                <textarea
                                    name="treatmentNote"
                                    placeholder="ระบุรายละเอียดการรักษา"
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* สถานะการสั่งยา */}
                <section className="prescription-card">
                    <h3>สถานะการสั่งยา</h3>

                    <div className="prescription-choice">
                        <label className={hasMedicine === 'yes' ? 'selected' : ''}>
                            <input
                                type="radio"
                                value="yes"
                                checked={hasMedicine === 'yes'}
                                onChange={() => setHasMedicine('yes')}
                            />
                            มีการสั่งยา
                        </label>

                        <label className={hasMedicine === 'no' ? 'selected' : ''}>
                            <input
                                type="radio"
                                value="no"
                                checked={hasMedicine === 'no'}
                                onChange={() => setHasMedicine('no')}
                            />
                            ไม่มีการสั่งยา
                        </label>
                    </div>
                </section>

                {/* รายการยา */}
                {hasMedicine === 'yes' && (
                    <section className="prescription-card">
                        <div className="prescription-section-header">
                            <h3>รายการยาใหม่</h3>

                            <button
                                type="button"
                                className="add-medicine-btn"
                                onClick={addMedicine}
                            >
                                เพิ่มรายการยา
                            </button>
                        </div>

                        {loadingMedicines && <p>กำลังโหลดรายการยา...</p>}

                        {medicines.map((medicine, index) => (
                            <div className="medicine-box" key={index}>
                                <div className="medicine-header">
                                    <strong>รายการยาที่ {index + 1}</strong>

                                    {medicines.length > 1 && (
                                        <button
                                            type="button"
                                            className="remove-medicine-btn"
                                            onClick={() => removeMedicine(index)}
                                        >
                                            ลบรายการ
                                        </button>
                                    )}
                                </div>

                                <div className="prescription-grid">
                                    <div className="prescription-field">
                                        <label>ชื่อยา</label>

                                        <select
                                            value={medicine.medicineId}
                                            onChange={e =>
                                                selectMedicine(index, e.target.value)
                                            }
                                            required
                                        >
                                            <option value="">เลือกยา</option>

                                            {medicineCatalog.map(item => (
                                                <option
                                                    key={item.MedicineId}
                                                    value={item.MedicineId}
                                                >
                                                    {item.MedicineName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="prescription-field">
                                        <label>ความแรงของยา</label>
                                        <input
                                            value={medicine.strength}
                                            placeholder="ความแรงของยา"
                                            readOnly
                                        />
                                    </div>

                                    <div className="prescription-field">
                                        <label>ขนาดยาต่อครั้ง</label>
                                        <input
                                            value={medicine.dosage}
                                            onChange={e =>
                                                updateMedicine(index, 'dosage', e.target.value)
                                            }
                                            placeholder="เช่น 1 เม็ด"
                                            required
                                        />
                                    </div>

                                    <div className="prescription-field">
                                        <label>วิธีใช้ยา</label>
                                        <select
                                            value={medicine.route}
                                            onChange={e =>
                                                updateMedicine(index, 'route', e.target.value)
                                            }
                                        >
                                            <option>รับประทาน</option>
                                            <option>อื่น ๆ</option>
                                        </select>
                                    </div>

                                    <div className="prescription-field">
                                        <label>ความถี่ในการใช้</label>
                                        <input
                                            value={medicine.frequency}
                                            onChange={e =>
                                                updateMedicine(index, 'frequency', e.target.value)
                                            }
                                            placeholder="เช่น วันละ 3 ครั้ง"
                                            required
                                        />
                                    </div>

                                    <div className="prescription-field">
                                        <label>ช่วงเวลารับประทาน</label>
                                        <select
                                            value={medicine.meal}
                                            onChange={e =>
                                                updateMedicine(index, 'meal', e.target.value)
                                            }
                                        >
                                            <option>ก่อนอาหาร</option>
                                            <option>หลังอาหาร</option>
                                            <option>พร้อมอาหาร</option>
                                            <option>ก่อนนอน</option>
                                            <option>เมื่อมีอาการ</option>
                                            <option>ไม่เกี่ยวกับอาหาร</option>
                                        </select>
                                    </div>

                                    <div className="prescription-field">
                                        <label>ระยะเวลาใช้ยา</label>
                                        <input
                                            value={medicine.duration}
                                            onChange={e =>
                                                updateMedicine(index, 'duration', e.target.value)
                                            }
                                            placeholder="เช่น 5 วัน"
                                            required
                                        />
                                    </div>

                                    <div className="prescription-field">
                                        <label>จำนวนยา</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={medicine.quantity}
                                            onChange={e =>
                                                updateMedicine(index, 'quantity', e.target.value)
                                            }
                                            placeholder="จำนวน"
                                            required
                                        />
                                    </div>

                                    <div className="prescription-field full-width">
                                        <label>คำแนะนำเพิ่มเติม</label>
                                        <textarea
                                            value={medicine.instruction}
                                            onChange={e =>
                                                updateMedicine(index, 'instruction', e.target.value)
                                            }
                                            placeholder="คำแนะนำหรือข้อควรระวัง"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* หมายเหตุจากแพทย์ */}
                <section className="prescription-card">
                    <h3>หมายเหตุจากแพทย์</h3>

                    <textarea
                        name="doctorNote"
                        className="doctor-note"
                        placeholder="ระบุคำแนะนำเพิ่มเติมสำหรับคนไข้หรือฝ่ายยา"
                    />
                </section>

                {/* ปุ่มบันทึก */}
                <div className="prescription-actions">
                    <button
                        type="button"
                        className="cancel-prescription-btn"
                        onClick={() => {
                            setHasMedicine('yes');
                            setMedicines([{ ...emptyMedicine }]);
                        }}
                    >
                        ล้างข้อมูล
                    </button>

                    <button
                        type="submit"
                        className="save-prescription-btn"
                        disabled={!selectedPatient || saving || loadingHistory}
                    >
                        {saving ? 'กำลังบันทึก...' : 'บันทึกประวัติและใบสั่งยา'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Prescription;
