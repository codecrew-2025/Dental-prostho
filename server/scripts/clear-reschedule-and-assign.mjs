import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Appointment from '../models/AppoitmentBooked.js';
import GeneralCase from '../models/GeneralCase.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true });
  const patientId = '2606012';
  const bookingId = 'SRMDNT292608';
  const pgIdentity = 'PGDNT01';
  const pgName = 'Ravindren';

  console.log(`Updating appointment ${bookingId}...`);
  const appt = await Appointment.findOne({ bookingId });
  if (!appt) {
    console.error(`❌ Appointment ${bookingId} not found`);
    process.exit(1);
  }

  // 1. Clear the pending reschedule request
  appt.rescheduleRequest = undefined;
  
  // 2. Assign the appointment to PG Ravindren (PGDNT01)
  appt.doctorId = pgIdentity;
  appt.assignedPgUgId = pgIdentity;
  appt.assigned_pg_ug_id = pgIdentity;
  appt.pgDoctorId = pgIdentity;
  appt.status = 'pending'; // Keep as pending so they see "Accept" button
  appt.isProcessed = false;
  appt.currentDepartment = 'Prosthodontics';
  appt.deptDoctorId = 'DNT01';
  appt.supervisingDeptDoctorId = 'DNT01';
  appt.supervising_dept_doctor_id = 'DNT01';

  await appt.save();
  console.log('✅ Appointment updated: reschedule request cleared, assigned to PG Ravindren');

  // 3. Find the latest GeneralCase referral to Prosthodontics and assign it to PG Ravindren
  console.log(`Updating latest GeneralCase for patient ${patientId} referred to Prosthodontics...`);
  const genCase = await GeneralCase.findOne({
    patientId,
    referredDepartment: 'Prosthodontics'
  }).sort({ createdAt: -1 });

  if (genCase) {
    genCase.assignedPgId = pgIdentity;
    genCase.assignedPgName = pgName;
    genCase.specialistStatus = 'approved';
    genCase.pgAssignedAt = new Date();
    await genCase.save();
    console.log(`✅ GeneralCase ${genCase._id} updated: assigned to PG Ravindren`);
  } else {
    console.log('❌ No GeneralCase referral to Prosthodontics found');
  }

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
