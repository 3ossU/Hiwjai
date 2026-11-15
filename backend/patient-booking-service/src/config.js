module.exports = {
  ROLES: { patient: 'patient', doctor: 'doctor', nurse: 'nurse', admin: 'admin' },

  // ช่วงเวลานัด (1 slot = 60 นาที) รูปแบบ HH:MM
  SLOTS: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
  SLOT_MINUTES: 60,

  // สถานะใน booking.status ของเพื่อน
  STATUS_BOOKED: 'scheduled',
  STATUS_CANCELLED: 'cancelled',
};