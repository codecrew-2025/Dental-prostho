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
  console.log('Connected to DB');

  const pendingAppts = await Appointment.find({ status: 'pending' }).limit(10).lean();
  console.log(`Found ${pendingAppts.length} pending appointments:`);
  pendingAppts.forEach(a => {
    console.log(`- Booking: ${a.bookingId}, Dept: ${a.currentDepartment}, Doctor: ${a.doctorId}, PG/UG: ${a.assignedPgUgId || a.assigned_pg_ug_id}`);
  });

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
