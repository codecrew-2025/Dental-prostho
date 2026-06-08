import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import { User } from '../models/User.js';
import pkg from 'jsonwebtoken';
const { sign } = pkg;

const fetch = globalThis.fetch || (await import('node-fetch')).default;

const run = async () => {
  try {
    await connectDB();

    // Find a PG user
    const pg = await User.findOne({ role: { $in: ['pg', 'ug'] } }).lean();
    if (!pg) return console.error('No PG/UG account found in DB');

    const secret = process.env.JWT_SECRET || 'defaultsecret';
    const token = sign({ userId: pg._id, role: pg.role }, secret, { expiresIn: '8h' });

    const port = process.env.PORT || 5000;
    const url = `http://localhost:${port}/api/appointment/pg-appointments`;

    console.log('Calling', url, 'as', pg.Identity || pg._id);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Response keys:', Object.keys(json));
    if (Array.isArray(json.appointments)) {
      console.log('Appointments count:', json.appointments.length);
      const target = json.appointments.find(a => a.bookingId === 'TEST-1780828338824');
      console.log('Test appointment JSON:', target);
      try { console.log('Test appointment raw JSON:', JSON.stringify(target, null, 2)); } catch(e) {}
      const sample = json.appointments.slice(0,5);
      console.log('Sample appointments:', sample.map(a => ({ bookingId: a.bookingId, patientId: a.patientId, chiefComplaint: a.chiefComplaint, assignedPgId: a.assignedPgId })));
    } else {
      console.log('Full response:', json);
    }
  } catch (err) {
    console.error('Error calling PG endpoint:', err);
  }
};

run();
