
import { useState, useEffect } from 'react';
import { store } from '../api';
import './Prescription.css';

function Prescription() {

    // สถานะการสั่งยา
    const [hasMedicine, setHasMedicine] = useState('yes');

    // รายการยา
    const [medicines, setMedicines] = useState([
        {
            name: '',
            strength: '',
            dosage: '',
            route: 'รับประทาน',
            frequency: '',
            meal: 'หลังอาหาร',
            duration: '',
            quantity: '',
            instruction: ''
        }
    ]);

    // รายการนัดหมาย
    const [appointments, setAppointments] = useState([]);

    // รายการยาที่ดึงมาจากฐานข้อมูล
    const [medicineCatalog, setMedicineCatalog] = useState([]);

    // นัดหมายที่เลือก
    const [selectedAppointment, setSelectedAppointment] = useState('');

    // สถานะโหลดข้อมูล
    const [loading, setLoading] = useState(true);

    // ข้อความ Error
    const [error, setError] = useState('');






    // ดึงข้อมูลนัดหมายจาก Appointment Service
    useEffect(() => {

        const fetchAppointments = async () => {

            try {
                const token = store.token();

                if (!token) {
                    throw new Error('ไม่พบ Token กรุณาเข้าสู่ระบบใหม่');
                }

                const response = await fetch(
                    'http://localhost:3005/api/appointments',
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || 'ไม่สามารถดึงข้อมูลนัดหมายได้'
                    );
                }

                setAppointments(result.data || []);

            } catch (error) {

                console.error('Fetch appointments error:', error);
                setError(error.message);

            } finally {

                setLoading(false);

            }
        };

        fetchAppointments();

    }, []);





    // ดึงรายการยาจาก Prescription Service
    useEffect(() => {

        const fetchMedicines = async () => {
            try {
                const token = store.token();

                const response = await fetch(
                    'http://localhost:3006/api/prescriptions/medicines',
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'ไม่สามารถดึงข้อมูลยาได้');
                }

                setMedicineCatalog(result.data || []);

            } catch (error) {
                console.error('Fetch medicines error:', error);
                setError(error.message);
            }
        };

        fetchMedicines();

    }, []);







    // ค้นหาข้อมูลนัดหมายที่แพทย์เลือก
    const selectedData = appointments.find(
        item => String(item.booking_id) === String(selectedAppointment)
    );

    // สร้างรายการยาใหม่
    const addMedicine = () => {

        setMedicines([
            ...medicines,
            {
                name: '',
                strength: '',
                dosage: '',
                route: 'รับประทาน',
                frequency: '',
                meal: 'หลังอาหาร',
                duration: '',
                quantity: '',
                instruction: ''
            }
        ]);

    };

    // ลบรายการยา
    const removeMedicine = (index) => {

        setMedicines(
            medicines.filter((_, i) => i !== index)
        );

    };

    // แก้ไขข้อมูลยา
    const updateMedicine = (index, field, value) => {

        const updated = [...medicines];

        updated[index][field] = value;

        setMedicines(updated);

    };

    // บันทึกข้อมูลใบสั่งยา 
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedData) {
            alert('กรุณาเลือกนัดหมาย');
            return;
        }

        try {
            const token = store.token();

            const data = {
                user_id: selectedData.user_id,
                booking_id: selectedData.booking_id,
                DoctorNote: e.target.doctorNote.value,

                Medicines: hasMedicine === 'yes'
                    ? medicines
                    : []
            };

            const response = await fetch(
                'http://localhost:3006/api/prescriptions',
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
                throw new Error(result.message || 'บันทึกใบสั่งยาไม่สำเร็จ');
            }

            alert('บันทึกใบสั่งยาสำเร็จ');

            console.log('Saved Prescription:', result);

            resetForm();

        } catch (error) {
            console.error('Save prescription error:', error);
            alert(error.message);
        }
    };

    // ล้างข้อมูลในฟอร์ม
    const resetForm = () => {

        setHasMedicine('yes');

        setSelectedAppointment('');

        setMedicines([
            {
                name: '',
                strength: '',
                dosage: '',
                route: 'รับประทาน',
                frequency: '',
                meal: 'หลังอาหาร',
                duration: '',
                quantity: '',
                instruction: ''
            }
        ]);

    };

    return (

        <div className="prescription-page">

            {/* ส่วนหัว */}
            <div className="prescription-heading">
                <div>
                    <h1>ฟอร์มสั่งยา</h1>
                    {/* <p>จัดการรายการสั่งยาของคนไข้</p> */}
                </div>
            </div>

            <form onSubmit={handleSubmit}>

                {/* ส่วนที่ 1 ข้อมูลคนไข้ */}
                <section className="prescription-card">

                    <h3>ข้อมูลคนไข้</h3>

                    {loading && (
                        <p>กำลังโหลดข้อมูลนัดหมาย...</p>
                    )}

                    {error && (
                        <p style={{ color: 'red' }}>
                            {error}
                        </p>
                    )}

                    {!loading && !error && (

                        <>
                            <div className="prescription-field">

                                <label>เลือกนัดหมาย</label>

                                <select
                                    value={selectedAppointment}
                                    onChange={e => setSelectedAppointment(e.target.value)}
                                    required
                                >

                                    <option value="">
                                        เลือกนัดหมาย 
                                    </option>

                                    {appointments.map(item => (

                                        <option
                                            key={item.booking_id}
                                            value={item.booking_id}
                                        >
                                            นัดหมาย #{item.booking_id}
                                            {' - '}
                                            {item.patient_first_name}
                                            {' '}
                                            {item.patient_last_name}
                                            {' ('}
                                            {item.appointment_date}
                                            {')'}

                                        </option>

                                    ))}

                                </select>

                                {appointments.length === 0 && (
                                    <p className="prescription-hint">
                                        ไม่พบรายการนัดหมาย
                                    </p>
                                )}

                            </div>

                            {/* แสดงข้อมูลคนไข้หลังเลือกนัดหมาย */}
                            {selectedData && (

                                <div className="prescription-grid">

                                    <div className="prescription-field">
                                        <label>รหัสคนไข้</label>

                                        <input
                                            value={selectedData.patient_id || ''}
                                            readOnly
                                        />
                                    </div>

                                    <div className="prescription-field">
                                        <label>รหัสการนัดหมาย</label>

                                        <input
                                            value={selectedData.booking_id || ''}
                                            readOnly
                                        />
                                    </div>

                                    <div className="prescription-field">
                                        <label>HN</label>

                                        <input
                                            value={selectedData.hn || ''}
                                            readOnly
                                        />
                                    </div>

                                    <div className="prescription-field">
                                        <label>ชื่อคนไข้</label>

                                        <input
                                            value={`${selectedData.patient_first_name || ''} ${selectedData.patient_last_name || ''}`}
                                            readOnly
                                        />
                                    </div>

                                </div>

                            )}

                        </>

                    )}

                </section>

                {/* ส่วนที่ 2 สถานะการสั่งยา */}
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

                {/* ส่วนที่ 3 รายการยา */}
                {hasMedicine === 'yes' && (

                    <section className="prescription-card">

                        <div className="prescription-section-header">

                            <h3>รายการยา</h3>

                            <button
                                type="button"
                                className="add-medicine-btn"
                                onClick={addMedicine}
                            >
                                เพิ่มรายการยา
                            </button>

                        </div>

                        {medicines.map((medicine, index) => (

                            <div className="medicine-box" key={index}>

                                <div className="medicine-header">

                                    <strong>
                                        รายการยาที่ {index + 1}
                                    </strong>

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

                                    {/* เลือกชื่อยาจากฐานข้อมูล */}
                                    <div className="prescription-field">
                                        <label>ชื่อยา</label>

                                        <select
                                            value={medicine.medicineId || ''}
                                            onChange={e => {
                                                const selectedMedicine = medicineCatalog.find(
                                                    item => String(item.MedicineId) === e.target.value
                                                );

                                                const updated = [...medicines];

                                                updated[index] = {
                                                    ...updated[index],
                                                    medicineId: selectedMedicine?.MedicineId || '',
                                                    name: selectedMedicine?.MedicineName || '',
                                                    strength: selectedMedicine?.Strength || ''
                                                };

                                                setMedicines(updated);
                                            }}
                                            required
                                        >
                                            <option value=""> เลือกยา </option>

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

                                    {/* แสดงความแรงอัตโนมัติ */}
                                    <div className="prescription-field">
                                        <label>ความแรงของยา</label>

                                        <input
                                            value={medicine.strength}
                                            placeholder="ระบบจะแสดงความแรงอัตโนมัติ"
                                            readOnly
                                        />
                                    </div>

                                    {/* ขนาดยาต่อครั้ง */}
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

                                    {/* วิธีใช้ยา */}
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

                                    {/* ความถี่ */}
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

                                    {/* ช่วงเวลารับประทาน */}
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

                                    {/* ระยะเวลา */}
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

                                    {/* จำนวนยา */}
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

                                    {/* คำแนะนำ */}
                                    <div className="prescription-field full-width">
                                        <label>คำแนะนำเพิ่มเติม</label>

                                        <textarea
                                            value={medicine.instruction}
                                            onChange={e =>
                                                updateMedicine(index, 'instruction', e.target.value)
                                            }
                                            placeholder="คำแนะนำหรือข้อควรระวังในการใช้ยา"
                                        />
                                    </div>

                                </div>

                            </div>

                        ))}

                    </section>

                )}

                {/* ส่วนที่ 4 หมายเหตุแพทย์ */}
                <section className="prescription-card">

                    <h3>หมายเหตุจากแพทย์</h3>

                    <textarea
                        name="doctorNote"
                        className="doctor-note"
                        placeholder="ระบุคำแนะนำเพิ่มเติมสำหรับคนไข้หรือฝ่ายยา"
                    />

                </section>

                {/* ปุ่มจัดการฟอร์ม */}
                <div className="prescription-actions">

                    <button
                        type="button"
                        className="cancel-prescription-btn"
                        onClick={resetForm}
                    >
                        ล้างข้อมูล
                    </button>

                    <button
                        type="submit"
                        className="save-prescription-btn"
                        disabled={loading || !selectedData}
                    >
                        บันทึกใบสั่งยา
                    </button>

                </div>

            </form>

        </div>

    );
}

export default Prescription;
