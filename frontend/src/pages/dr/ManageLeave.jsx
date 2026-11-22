
import { useState, useEffect } from "react";
import { svc, store } from "../../api";
import "./ManageLeave.css";

function ManageLeave() {
  const user = store.user();

  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // คำนวณวันที่เริ่มลาได้เร็วที่สุด: 1 เดือนนับจากวันนี้
  const minDate = (() => {
    const today = new Date();
    const target = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      Math.min(
        today.getDate(),
        new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()
      )
    );

    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  })();

  // โหลดประวัติการลาของตัวเอง
  const fetchLeaves = async () => {
    if (!user?.id) {
      setError("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    try {
      const result = await svc("leave", `/api/leaves/${user.id}`);
      setLeaves(result.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user?.id]);

  // ส่งคำขอวันหยุด
  const submitLeave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!user?.id) {
      setError("ไม่พบข้อมูลแพทย์ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    if (!leaveType || !startDate || !endDate) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    if (startDate < minDate) {
      setError("ต้องแจ้งวันหยุดล่วงหน้าอย่างน้อย 1 เดือน");
      return;
    }

    if (endDate < startDate) {
      setError("วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น");
      return;
    }

    setLoading(true);

    try {
      await svc("leave", "/api/leaves", {
        method: "POST",
        body: {
          user_id: user.id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason
        }
      });

      setMessage("ส่งคำขอวันหยุดสำเร็จ รอการอนุมัติ");
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");

      await fetchLeaves();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusText = {
    pending: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ"
  };

  return (
    <div className="page-content manage-leave">
      <div className="leave-header">
        <h1>จัดการวันหยุด</h1>
        <p>ส่งคำขอวันหยุดล่วงหน้าอย่างน้อย 1 เดือน</p>
      </div>

      <div className="leave-form">
        <h3>ยื่นคำขอวันหยุด</h3>

        <form onSubmit={submitLeave}>
          <label>ประเภทการลา</label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            required
          >
            <option value="">เลือกประเภทการลา</option>
            <option value="personal">ลากิจ</option>
            <option value="vacation">ลาพักร้อน</option>
            <option value="sick">ลาป่วย</option>
          </select>

          <label>วันที่เริ่มหยุด</label>
          <input
            type="date"
            min={minDate}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate && endDate < e.target.value) {
                setEndDate("");
              }
            }}
            required
          />

          <label>วันที่สิ้นสุด</label>
          <input
            type="date"
            min={startDate || minDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />

          <label>เหตุผลการลา</label>
          <textarea
            placeholder="ระบุเหตุผลการลา"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && <p className="leave-error">{error}</p>}
          {message && <p className="leave-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "กำลังส่ง..." : "ส่งคำขอวันหยุด"}
          </button>
        </form>
      </div>

      <div className="leave-history">
        <h3>ประวัติการลา</h3>

        {leaves.length === 0 ? (
          <p>ยังไม่มีประวัติการลา</p>
        ) : (
          <div className="leave-list">
            {leaves.map((leave) => (
              <div className="leave-item" key={leave.id}>
                <p>
                  <strong>ประเภท:</strong> {leave.leave_type}
                </p>
                <p>
                  <strong>วันที่:</strong> {String(leave.start_date).slice(0, 10)}
                  {" ถึง "}
                  {String(leave.end_date).slice(0, 10)}
                </p>
                <p>
                  <strong>เหตุผล:</strong> {leave.reason || "-"}
                </p>
                <p>
                  <strong>สถานะ:</strong>{" "}
                  <span className={`leave-status ${leave.status}`}>
                    {statusText[leave.status] || leave.status}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageLeave;
