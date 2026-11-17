
import React, { useEffect, useState } from "react";
import "./DocAppointments.css";
import { store } from "../api";

function DocAppointments() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ดึงข้อมูลนัดหมายเฉพาะแพทย์ที่ Login
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    "http://localhost:3005/api/appointments",
                    {
                        headers: {
                            Authorization: `Bearer ${store.token()}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "ไม่สามารถเชื่อมต่อ Appointment Service ได้"
                    );
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(
                        result.message || "ไม่สามารถดึงข้อมูลนัดหมายได้"
                    );
                }

                const formattedData = result.data.map((item) => ({
                    id: item.booking_id,
                    hn: item.hn || "-",

                    name: [
                        item.patient_first_name,
                        item.patient_last_name
                    ].filter(Boolean).join(" ") || "ไม่พบชื่อคนไข้",

                    date: item.appointment_date
                        ? new Date(item.appointment_date).toLocaleDateString("th-TH")
                        : "-",

                    rawDate: item.appointment_date,

                    time: `${item.start_time || "-"} - ${item.end_time || "-"}`,

                    doctor: [
                        item.doctor_first_name,
                        item.doctor_last_name
                    ].filter(Boolean).join(" ") || "-",

                    nurse: [
                        item.nurse_first_name,
                        item.nurse_last_name
                    ].filter(Boolean).join(" ") || "-",

                    note: item.note || "-",
                    status: item.status
                }));

                setAppointments(formattedData);

            } catch (err) {
                console.error("Appointment Error:", err);
                setError(err.message);

            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

    // ค้นหาและกรองรายการ
    const filteredAppointments = appointments.filter((item) => {
        const keyword = search.toLowerCase();

        const matchSearch =
            item.name.toLowerCase().includes(keyword) ||
            String(item.id).includes(keyword) ||
            item.hn.toLowerCase().includes(keyword);

        const matchStatus =
            status === "all" || item.status === status;

        return matchSearch && matchStatus;
    });

    // นับจำนวนรายการนัดหมาย
    const today = new Date().toLocaleDateString("en-CA");

    const todayCount = appointments.filter((item) => {
        if (!item.rawDate) return false;

        const date = new Date(item.rawDate)
            .toLocaleDateString("en-CA");

        return date === today;
    }).length;

    const scheduledCount = appointments.filter(
        (item) => item.status === "scheduled"
    ).length;

    const cancelledCount = appointments.filter(
        (item) => item.status === "cancelled"
    ).length;

    // แปลงสถานะเป็นภาษาไทย
    const getStatusText = (value) => {
        switch (value) {
            case "scheduled":
                return "นัดหมายแล้ว";

            case "cancelled":
                return "ยกเลิก";

            default:
                return value || "-";
        }
    };

    const getStatusClass = (value) => {
        switch (value) {
            case "scheduled":
                return "confirmed";

            case "cancelled":
                return "cancelled";

            default:
                return "";
        }
    };

    // แสดงรายละเอียด
    const showDetail = (item) => {
        alert(
            `รหัสนัดหมาย: ${item.id}\n` +
            `HN: ${item.hn}\n` +
            `ชื่อคนไข้: ${item.name}\n` +
            `วันที่: ${item.date}\n` +
            `เวลา: ${item.time}\n` +
            `แพทย์: ${item.doctor}\n` +
            `ผู้บันทึก: ${item.nurse}\n` +
            `หมายเหตุ: ${item.note}\n` +
            `สถานะ: ${getStatusText(item.status)}`
        );
    };

    return (
        <div className="page-content">

            {/* Page Heading */}
            <div className="page-heading">
                <h1>ตารางนัดหมาย</h1>
                {/* <p>
                    ตรวจสอบนัดหมายที่คนไข้จองเข้ามา
                    และติดตามสถานะการเข้ารับบริการ
                </p> */}
            </div>

            {/* Summary */}
            <div className="summary-grid">

                <div className="summary-card">
                    <strong className="summary-green">
                        {todayCount}
                    </strong>
                    <span>นัดหมายวันนี้</span>
                </div>

                <div className="summary-card">
                    <strong className="summary-orange">
                        {scheduledCount}
                    </strong>
                    <span>นัดหมายแล้ว</span>
                </div>

                <div className="summary-card">
                    <strong className="summary-blue">
                        {cancelledCount}
                    </strong>
                    <span>ยกเลิก</span>
                </div>

                <div className="summary-card">
                    <strong className="summary-dark">
                        {appointments.length}
                    </strong>
                    <span>นัดหมายทั้งหมด</span>
                </div>

            </div>

            {/* Search and Filter */}
            {/* Search and Filter */}
            <div className="filter-panel">

                <div className="filter-item">
                    <label>ค้นหาคนไข้</label>
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="ค้นหาคนไข้ / ชื่อ / รหัส HN"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-item">
                    <label>สถานะ</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="all">ทั้งหมด</option>
                        <option value="scheduled">นัดหมายแล้ว</option>
                        <option value="cancelled">ยกเลิก</option>
                    </select>
                </div>

                <div className="filter-item">
                    <label>&nbsp;</label>
                    <button
                        className="add-booking-button"
                        onClick={() => window.location.reload()}
                    >
                        รีเฟรชข้อมูล
                    </button>
                </div>

            </div>

            {/* Appointment Table */}
            <div className="table-panel">

                <div className="table-heading">
                    <div>
                        <h2>รายการนัดหมาย</h2>
                        <p>แสดงรายการนัดหมายของแพทย์ที่เข้าสู่ระบบ</p>
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="table-scroll">
                    <table className="appointment-table">

                        <thead>
                            <tr>
                                <th>คนไข้</th>
                                <th>วัน / เวลา</th>
                                <th>แพทย์ผู้ดูแล</th>
                                <th>ผู้บันทึก</th>
                                <th>สถานะ</th>
                                <th>รายละเอียด</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        กำลังโหลดข้อมูลนัดหมาย
                                    </td>
                                </tr>

                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        ไม่สามารถโหลดข้อมูลได้
                                    </td>
                                </tr>

                            ) : filteredAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        ไม่พบรายการนัดหมาย
                                    </td>
                                </tr>

                            ) : (
                                filteredAppointments.map((item) => (
                                    <tr key={item.id}>

                                        <td>
                                            <strong>{item.name}</strong>
                                            <small>HN: {item.hn}</small>
                                        </td>

                                        <td>
                                            {item.date}
                                            <small>{item.time}</small>
                                        </td>

                                        <td>{item.doctor}</td>

                                        <td>{item.nurse}</td>

                                        <td>
                                            <span
                                                className={`status-badge ${getStatusClass(item.status)}`}
                                            >
                                                {getStatusText(item.status)}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="detail-button"
                                                onClick={() => showDetail(item)}
                                            >
                                                ดูข้อมูล
                                            </button>
                                        </td>

                                    </tr>
                                ))
                            )}

                        </tbody>

                    </table>
                </div>

                <div className="table-footer">
                    <span>
                        แสดง {filteredAppointments.length} จาก {appointments.length} รายการ
                    </span>
                </div>

            </div>

        </div>
    );
}

export default DocAppointments;
