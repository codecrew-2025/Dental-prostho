import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Appointment from '../models/AppoitmentBooked.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true });
  const appointments = await Appointment.find({ patientId: '2606012' }).lean();
  console.log('=== ALL APPOINTMENTS AND RESCHEDULE REQUESTS ===');
  appointments.forEach(a => {
    console.log(`Booking ID: ${a.bookingId}`);
    console.log(`  Date: ${a.appointmentDate}, Time: ${a.appointmentTime}`);
    console.log(`  Dept: ${a.currentDepartment || a.department}`);
    console.log(`  Status: ${a.status}`);
    console.log(`  Assigned PG/UG: ${a.assignedPgUgId || a.assigned_pg_ug_id || 'none'}`);
    console.log(`  Reschedule Request:`, JSON.stringify(a.rescheduleRequest, null, 2));
    console.log('------------------------------------------------');
  });
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
