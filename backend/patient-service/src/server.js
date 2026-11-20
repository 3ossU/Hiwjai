const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

// แปะไว้ก่อง จาเอาไป hash รหัสใส่ db 
const sampleHash = bcrypt.hashSync('123456', 10);
console.log("ค่า Hash ของรหัสผ่านใหม่ที่ถูกต้อง:", sampleHash);

// เชื่อม db
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hiwjai',
    port: process.env.DB_PORT || 3306
});

// แปลง allergies จาก DB/request ให้เป็น Array ของ Object [{ name }] เสมอ (ไม่เอา note)
function normalizeAllergiesObjects(allergies) {
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
}

// ดึงข้อมูลคนไข้ทั้งหมด
app.get('/api/patients', async (req, res) => {
    try {
        const { search } = req.query;

        let query = `
            SELECT p.id, p.hn, u.first_name, u.last_name, u.phone_number, u.avatar_url,
                   u.gender, p.birth_date, p.blood_group, p.allergies, p.address,
                   p.emergency_contact, p.emergency_contact_relation
            FROM patient_info p
            JOIN users u ON p.user_id = u.id
        `;
        let queryParams = [];

        if (search) {
            query += ` WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR p.hn LIKE ?`;
            queryParams = [`%${search}%`, `%${search}%`, `%${search}%`];
        }

        const [rows] = await pool.query(query, queryParams);

        const formattedRows = rows.map((row) => ({
            ...row,
            allergies: normalizeAllergiesObjects(row.allergies),
        }));

        res.json({ 
            success: true, 
            data: formattedRows 
        });
    } 
    catch (err) {
        console.error('Error fetching patients:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// ดูข้อมูลคนไข้รายคน
app.get('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT p.id, p.hn, u.first_name, u.last_name, u.phone_number, u.username, u.avatar_url,
                   u.gender, p.birth_date, p.weight, p.height, p.blood_group, 
                   p.allergies, p.address, p.emergency_contact, p.emergency_contact_relation
            FROM patient_info p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `;
        const [rows] = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        const patient = {
            ...rows[0],
            allergies: normalizeAllergiesObjects(rows[0].allergies),
        };

        res.json({ 
            success: true, 
            data: patient 
        });
    } 
    catch (err) {
        console.error('Error fetching patient detail:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// add user
app.post('/api/patients', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const {
            username, password, first_name, last_name, phone_number, avatar_url,
            hn, gender, birth_date, weight, height, blood_group, allergies, address,
            emergency_contact, emergency_contact_relation
        } = req.body;

        if (!username || !password || !first_name || !last_name || !hn) {
            connection.release();
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.beginTransaction();

        const userQuery = `
            INSERT INTO users (username, password_hash, first_name, last_name, phone_number, role, avatar_url, gender)
            VALUES (?, ?, ?, ?, ?, 'patient', ?, ?)
        `;

        const [userResult] = await connection.query(userQuery, [
            username, 
            hashedPassword,
            first_name, 
            last_name, 
            phone_number || null,
            avatar_url || null,
            gender || null
        ]);

        const newUserId = userResult.insertId;

        const patientQuery = `
            INSERT INTO patient_info (user_id, hn, birth_date, weight, height, blood_group, allergies, address, emergency_contact, emergency_contact_relation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const normalizedAllergies = normalizeAllergiesObjects(allergies);

        await connection.query(patientQuery, [
            newUserId,
            hn,
            birth_date || null,
            weight || null,
            height || null,
            blood_group || null,
            JSON.stringify(normalizedAllergies),
            address || null,
            emergency_contact || null,
            emergency_contact_relation || null
        ]);

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully with hashed password',
            userId: newUserId
        });

    } 
    catch (err) {
        await connection.rollback();
        connection.release();

        console.error('Error registering patient:', err);
        res.status(500).json({ success: false, error: 'Server Error or Duplicate Data (Username/HN already exists)' });
    }
});

// แก้ไขข้อมูลคนไข้
app.put('/api/patients/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { id } = req.params;
        
        const {
            first_name, last_name, phone_number, avatar_url,
            gender, birth_date, weight, height, blood_group, allergies, address,
            emergency_contact, emergency_contact_relation
        } = req.body;

        await connection.beginTransaction();

        const [patientRows] = await connection.query('SELECT user_id FROM patient_info WHERE id = ?', [id]);
        
        if (patientRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        const userId = patientRows[0].user_id;

        await connection.query(`
            UPDATE users 
            SET first_name = ?, last_name = ?, phone_number = ?, avatar_url = ?, gender = ?
            WHERE id = ?
        `, [first_name, last_name, phone_number || null, avatar_url || null, gender, userId]);

        const normalizedAllergies = normalizeAllergiesObjects(allergies);

        await connection.query(`
            UPDATE patient_info 
            SET birth_date = ?, weight = ?, height = ?, blood_group = ?, allergies = ?, address = ?,
                emergency_contact = ?, emergency_contact_relation = ?
            WHERE id = ?
        `, [
            birth_date || null,
            weight ? parseFloat(weight) : null,
            height ? parseFloat(height) : null,
            blood_group || null,
            JSON.stringify(normalizedAllergies),
            address || null,
            emergency_contact || null,
            emergency_contact_relation ? String(emergency_contact_relation).trim() : null,
            id
        ]);

        await connection.commit(); 
        connection.release();

        res.json({ success: true, message: 'อัปเดตข้อมูลผู้ป่วยสำเร็จ' });
    } 
    catch (error) {
        await connection.rollback();
        connection.release();
        console.error("Update patient error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Patient Service is running on port ${PORT}`);
});