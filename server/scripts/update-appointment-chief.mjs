import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import Appointment from '../models/AppoitmentBooked.js';

const run = async () => {
  await connectDB();
  const bookingId = 'TEST-1780828338824';
  const appt = await Appointment.findOneAndUpdate({ bookingId }, { $set: { chiefComplaint: 'Dental Caries' } }, { new: true }).lean();
  console.log('Updated appointment:', appt && { bookingId: appt.bookingId, chiefComplaint: appt.chiefComplaint });
  process.exit(0);
};

run();
