import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import Appointment from '../models/AppoitmentBooked.js';

const run = async () => {
  await connectDB();
  const bookingId = 'TEST-1780828338824';
  const appt = await Appointment.findOne({ bookingId }).lean();
  console.log('Appointment:', appt);
  process.exit(0);
};

run();
