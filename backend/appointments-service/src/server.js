
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import appointmentRoutes from './DocAppointments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Appointment Service is running!');
});

app.use('/api/appointments', appointmentRoutes);

app.listen(PORT, () => {
    console.log(`Appointment Service is running on port ${PORT}`);
});
