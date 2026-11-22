
import { useState } from "react";
import { store } from "../../api";
import "./PatientHistory.css";

function PatientHistory() {
    const apiUrl = "http://localhost:3003";

    const [search, setSearch] = useState("");
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [records, setRecords] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ค้นหาผู้ป่วย
    const searchPatients = async (e) => {
        e.preventDefault();

        if (!search.trim()) {
            setPatients([]);
            return;
        }

        setLoading(true);
        setError("");
        setSelectedPatient(null);
        setRecords([]);

        try {
            const token = store.token();

            if (!token) {
                throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
            }

            const response = await fetch(
                `http://localhost:5004/api/patients?search=${encodeURIComponent(search)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "ค้นหาผู้ป่วยไม่สำเร็จ"
                );
            }

            setPatients(result.data || []);

            if (!result.data?.length) {
                setError("ไม่พบข้อมูลผู้ป่วย");
            }

        } catch (err) {
            setError(err.message);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    };

    // เลือกผู้ป่วยและดึงประวัติการรักษา
    const selectPatient = async (patient) => {
        setSelectedPatient(patient);
        setPatients([]);
        setRecords([]);
        setError("");
        setLoading(true);

        try {
            const token = store.token();

            if (!token) {
                throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
            }

            const response = await fetch(
                `${apiUrl}/api/records/patient/${patient.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "ไม่สามารถดึงประวัติการรักษาได้"
                );
            }

            setRecords(result.data || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ข้อมูลการแพ้ส่งมาจาก patient-service ในผลการค้นหาผู้ป่วยอยู่แล้ว
    const getAllergies = (patient) => {
        if (!patient || patient.allergies == null) return null;
        let value = patient.allergies;
        if (typeof value === "string") {
            try {
                value = JSON.parse(value);
            } catch {
                return null;
            }
        }
        if (!Array.isArray(value)) return null;
        return value.map((item) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item === "object") {
                return String(item.name || item.allergen || item.label || "").trim();
            }
            return "";
        }).filter(Boolean);
    };

    // แปลงวันที่
    const formatDate = (date) => {
        if (!date) return "-";

        const parsedDate = new Date(
            String(date).replace(" ", "T")
        );

        if (isNaN(parsedDate.getTime())) return date;

        return parsedDate.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    return (
        <div className="page-content patient-history">

            {/* หัวข้อหน้า */}
            <div className="history-header">
                <div>
                    <h1>ประวัติผู้ป่วย</h1>
                    {/* <p>ค้นหาและดูประวัติการเข้ารับบริการของผู้ป่วย</p> */}
                </div>
            </div>

            {/* ค้นหาผู้ป่วย */}
            <div className="history-search">
                <h3>ค้นหาผู้ป่วย</h3>

                <form onSubmit={searchPatients}>
                    <input
                        type="text"
                        placeholder="ค้นหาด้วย HN หรือชื่อผู้ป่วย"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button type="submit" disabled={loading}>
                        <i className="bi bi-search"></i>
                        {loading ? "กำลังค้นหา..." : "ค้นหา"}
                    </button>
                </form>
            </div>

            {/* ผลการค้นหา */}
            {patients.length > 0 && (
                <div className="patient-results">
                    <h3>ผลการค้นหา</h3>

                    {patients.map(patient => (
                        <div
                            key={patient.id}
                            className="patient-result"
                            onClick={() => selectPatient(patient)}
                        >
                            <div className="patient-avatar">
                                <i className="bi bi-person"></i>
                            </div>

                            <div className="patient-info">
                                <h4>
                                    {patient.first_name} {patient.last_name}
                                </h4>
                                <p>HN: {patient.hn}</p>
                            </div>

                            <i className="bi bi-chevron-right"></i>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="history-error">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <p className="history-loading">
                    กำลังโหลดข้อมูล...
                </p>
            )}

            {/* ประวัติผู้ป่วย */}
            {selectedPatient && !loading && (
                <div className="records-section">

                    {/* ข้อมูลผู้ป่วย */}
                    <div className="selected-patient">
                        <div className="patient-avatar large">
                            <i className="bi bi-person"></i>
                        </div>

                        <div>
                            <h2>
                                {selectedPatient.first_name}{" "}
                                {selectedPatient.last_name}
                            </h2>
                            <p>HN: {selectedPatient.hn}</p>
                        </div>
                    </div>

                    {/* ประวัติการแพ้: ครอบคลุมยา อาหาร และสิ่งแวดล้อม */}
                    <section
                        aria-label="ประวัติการแพ้"
                        style={{
                            border: "1px solid #f0d4d4",
                            borderRadius: "12px",
                            padding: "18px 20px",
                            margin: "18px 0 24px",
                            backgroundColor: "#fffafa"
                        }}
                    >
                        <h3 style={{ margin: "0 0 12px", color: "#a72828" }}>
                            <i className="bi bi-exclamation-triangle" aria-hidden="true" />{" "}
                            ประวัติการแพ้
                        </h3>
                        {getAllergies(selectedPatient) === null ? (
                            <p style={{ margin: 0 }}>ไม่สามารถยืนยันข้อมูลการแพ้ได้ กรุณาตรวจสอบประวัติผู้ป่วย</p>
                        ) : getAllergies(selectedPatient).length === 0 ? (
                            <p style={{ margin: 0 }}>ไม่มีรายการแพ้ที่บันทึกไว้</p>
                        ) : (
                            <ul style={{ margin: 0, paddingLeft: "22px" }}>
                                {getAllergies(selectedPatient).map((name, index) => (
                                    <li key={`${name}-${index}`} style={{ marginBottom: "5px", color: "#9e2626", fontWeight: 600 }}>
                                        {name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* หัวข้อรายการประวัติ */}
                    <div className="records-heading">
                        <h3>ประวัติการรักษา</h3>
                        <span>{records.length} รายการ</span>
                    </div>

                    {/* แสดงประวัติ */}
                    {records.length === 0 ? (
                        <div className="history-empty">
                            <i className="bi bi-file-earmark-medical"></i>
                            <p>ยังไม่มีประวัติการรักษา</p>
                        </div>
                    ) : (
                        records.map(record => (
                            <div className="record-card" key={record.id}>

                                <div className="record-date">
                                    <i className="bi bi-calendar3"></i>
                                    {formatDate(record.visit_date)}
                                </div>

                                <div className="record-content">

                                    <p className="doctor-name">
                                        แพทย์: {record.doctor_first_name}{" "}
                                        {record.doctor_last_name}
                                    </p>

                                    <div className="record-detail">
                                        <strong>อาการสำคัญ</strong>
                                        <p>{record.chief_complaint || "-"}</p>
                                    </div>

                                    <div className="record-detail">
                                        <strong>การวินิจฉัย</strong>
                                        <p>{record.diagnosis || "-"}</p>
                                    </div>

                                    <div className="record-detail">
                                        <strong>รายละเอียดการรักษา</strong>
                                        <p>{record.treatment_note || "-"}</p>
                                    </div>

                                    <div className="record-detail">
                                        <strong>ยาที่ได้รับ</strong>

                                        {record.prescription?.length > 0 ? (
                                            record.prescription.map((medicine, index) => (
                                                <p key={index}>
                                                    {medicine.name}
                                                    {medicine.dose && ` - ${medicine.dose}`}
                                                    {medicine.duration && ` (${medicine.duration})`}
                                                </p>
                                            ))
                                        ) : (
                                            <p>-</p>
                                        )}
                                    </div>

                                    <div className="record-detail">
                                        <strong>วันนัดติดตาม</strong>
                                        <p>
                                            {formatDate(record.follow_up_date)}
                                        </p>
                                    </div>

                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default PatientHistory;
