module.exports = {
  ROLES: { patient: 'patient', doctor: 'doctor', nurse: 'nurse', admin: 'admin' },
  // role ที่ดูประวัติผู้ป่วยได้
  VIEWERS: ['doctor', 'nurse', 'admin'],
  // role ที่เขียน/แก้ประวัติได้
  WRITERS: ['doctor', 'admin'],
};