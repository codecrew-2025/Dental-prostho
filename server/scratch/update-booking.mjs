import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

import mongoose from 'mongoose';
import Appointment from '../models/AppoitmentBooked.js';

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing from env!');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true });
  const appt = await Appointment.findOne({ bookingId: 'SRMDNT292608' });
  if (appt) {
    appt.patientRescheduleStatus = 'pending';
    appt.originalDate = '2026-06-23';
    appt.originalTime = '10:00 AM';
    await appt.save();
    console.log('Successfully updated booking to patientRescheduleStatus: pending');
  } else {
    console.error('Booking not found!');
  }
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
