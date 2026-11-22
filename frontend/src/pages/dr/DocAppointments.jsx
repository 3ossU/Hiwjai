import React, { useEffect, useState } from "react";
import "./DocAppointments.css";
import { svc } from "../../api";

const typeName = { clinic: "Clinic visit", online: "Online", home: "Home visit" };

function DocAppointments() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [view, setView] = useState("upcoming");
    const [now, setNow] = useState(() => new Date());

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // อ่านวันที่จาก API แบบ YYYY-MM-DD โดยไม่เลื่อนวันตาม timezone
    const dateKey = (value) => {
        if (!value) return "";
        const text = String(value);
        const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
        if (iso) return iso[1];
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const todayKey = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const isPast = (item) => {
        const day = dateKey(item.rawDate);
        if (!day) return false;
        const today = todayKey(now);
        if (day !== today) return day < today;
        // เมื่อสิ้นสุดเวลานัดแล้ว ถือว่าเป็นรายการที่ผ่านมา
        const end = String(item.endTime || "").slice(0, 5);
        return Boolean(end) && end < `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    };

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            setError("");
            // ขอทั้งหมดเพื่อให้ยอดสรุปและทั้งสามแท็บตรงกัน
            // svc() ส่ง JWT และรองรับ refresh token เดิม
            const result = await svc("appointment", "/api/appointments?view=all");
            if (!result.success || !Array.isArray(result.data)) {
                throw new Error(result.message || "ไม่สามารถดึงข้อมูลนัดหมายได้");
            }
            const formattedData = result.data.map((item) => ({
                id: item.booking_id,
                hn: item.hn || "-",
                name: [item.patient_first_name, item.patient_last_name]
                    .filter(Boolean).join(" ") || "ไม่พบชื่อคนไข้",
                date: dateKey(item.appointment_date)
                    ? new Date(`${dateKey(item.appointment_date)}T12:00:00`).toLocaleDateString("th-TH")
                    : "-",
                rawDate: item.appointment_date,
                startTime: item.start_time || "",
                endTime: item.end_time || "",
                time: `${item.start_time || "-"} - ${item.end_time || "-"}`,
                doctor: [item.doctor_first_name, item.doctor_last_name]
                    .filter(Boolean).join(" ") || "-",
                nurse: item.booked_by_patient
                    ? "ผู้ป่วยจองเอง"
                    : ([item.nurse_first_name, item.nurse_last_name].filter(Boolean).join(" ") || "-"),
                note: item.addon_note || item.note || "-",
                appointmentType: typeName[item.appointment_type] || "Clinic visit",
                bookedByPatient: Boolean(item.booked_by_patient),
                status: item.status
            }));
            setAppointments(formattedData);
            setNow(new Date());
        } catch (err) {
            console.error("Appointment Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
        // อัปเดตการแบ่งรายการตามเวลาปัจจุบันทุกนาที
        const timer = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const isUpcoming = (item) =>
        item.status === "scheduled" && Boolean(dateKey(item.rawDate)) && !isPast(item);

    // ค้นหา กรองสถานะ เลือกแท็บ แล้วเรียงจากใกล้ไปไกล
    const filteredAppointments = appointments
        .filter((item) => {
            const keyword = search.trim().toLowerCase();
            const matchSearch =
                item.name.toLowerCase().includes(keyword) ||
                String(item.id).includes(keyword) ||
                item.hn.toLowerCase().includes(keyword);
            const matchStatus = status === "all" || item.status === status;
            const matchView = view === "all" ||
                (view === "upcoming" && isUpcoming(item)) ||
                (view === "past" && isPast(item));
            return matchSearch && matchStatus && matchView;
        })
        .sort((a, b) => {
            const aDate = dateKey(a.rawDate) || "9999-12-31";
            const bDate = dateKey(b.rawDate) || "9999-12-31";
            const dateDiff = aDate.localeCompare(bDate);
            if (dateDiff) return view === "past" ? -dateDiff : dateDiff;
            const timeDiff = String(a.startTime).localeCompare(String(b.startTime));
            return view === "past" ? -timeDiff : timeDiff;
        });

    const todayCount = appointments.filter((item) =>
        dateKey(item.rawDate) === todayKey(now) && item.status !== "cancelled"
    ).length;
    const upcomingCount = appointments.filter(isUpcoming).length;
    const cancelledCount = appointments.filter((item) => item.status === "cancelled").length;

    // แปลงสถานะเป็นภาษาไทย
    const getStatusText = (value) => {
        switch (value) {
            case "scheduled":
                return "นัดหมายแล้ว";
            case "cancelled":
                return "ยกเลิก";
            case "completed":
                return "เสร็จสิ้น";
            case "no_show":
                return "ไม่มาตามนัด";
            default:
                return value || "-";
        }
    };

    const displayStatus = (item) =>
        item.status === "scheduled" && isPast(item)
            ? "ผ่านเวลานัดแล้ว"
            : getStatusText(item.status);

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
            `ประเภทนัด: ${item.appointmentType}\n` +
            `แพทย์: ${item.doctor}\n` +
            `ผู้บันทึก: ${item.nurse}\n` +
            `เรื่องที่ปรึกษา/หมายเหตุ: ${item.note}\n` +
            `สถานะ: ${displayStatus(item)}`
        );
    };

    return (
        <div className="page-content">

            {/* Page Heading */}
            <div className="page-heading">
                <h1>ตารางนัดหมาย</h1>
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
                        {upcomingCount}
                    </strong>
                    <span>กำลังจะมาถึง</span>
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

            {/* เลือกช่วงนัดหมาย */}
            <div className="appointment-tabs" role="group" aria-label="เลือกช่วงนัดหมาย"
                style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {[
                    ["upcoming", "กำลังจะมาถึง"],
                    ["past", "ที่ผ่านมาแล้ว"],
                    ["all", "ทั้งหมด"]
                ].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={view === key}
                        onClick={() => setView(key)}
                        style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 8,
                            padding: "9px 16px",
                            fontWeight: 600,
                            cursor: "pointer",
                            background: view === key ? "#00b9d5" : "#fff",
                            color: view === key ? "#fff" : "#334155"
                        }}
                    >{label}</button>
                ))}
            </div>

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
                        <option value="completed">เสร็จสิ้น</option>
                        <option value="no_show">ไม่มาตามนัด</option>
                    </select>
                </div>

                <div className="filter-item">
                    <label>&nbsp;</label>
                    <button
                        className="add-booking-button"
                        onClick={fetchAppointments}
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
                                            <small>{item.appointmentType}</small>
                                            {item.note !== "-" && (
                                                <small style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    เรื่อง: {item.note}
                                                </small>
                                            )}
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
                                                {displayStatus(item)}
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