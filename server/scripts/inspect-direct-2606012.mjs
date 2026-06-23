import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Appointment from '../models/AppoitmentBooked.js';
import GeneralCase from '../models/GeneralCase.js';
import OralCase from '../models/Oral-model.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true });
  const patientId = '2606012';

  console.log(`=== CURRENT PATIENT DATA FOR ${patientId} ===`);

  const oralCases = await OralCase.find({ patientId }).sort({ createdAt: -1 }).lean();
  console.log(`Oral Cases: ${oralCases.length}`);
  oralCases.forEach((c, i) => {
    console.log(`  [OralCase ${i + 1}] ID: ${c._id}, ReferredDept: "${c.referredDepartment}", ReferralDepts: ${JSON.stringify(c.referralDepartments)}`);
  });

  const generalCases = await GeneralCase.find({ patientId }).sort({ createdAt: -1 }).lean();
  console.log(`General Cases: ${generalCases.length}`);
  generalCases.forEach((c, i) => {
    console.log(`  [GeneralCase ${i + 1}] ID: ${c._id}, ReferredDept: "${c.referredDepartment}", SpecialistDoctor: "${c.specialistDoctorName}" (${c.specialistDoctorId}), Status: "${c.specialistStatus}", AssignedPG: "${c.assignedPgName}" (${c.assignedPgId})`);
  });

  const appointments = await Appointment.find({ patientId }).sort({ appointmentDate: -1, createdAt: -1 }).lean();
  console.log(`Appointments: ${appointments.length}`);
  appointments.forEach((a, i) => {
    console.log(`  [Appointment ${i + 1}] ID: ${a.bookingId}, Date: ${a.appointmentDate}, Dept: "${a.currentDepartment || a.department}", Status: "${a.status}", Processed: ${a.isProcessed}, Doctor: "${a.doctorId}", Assigned PG/UG: "${a.assignedPgUgId || a.assigned_pg_ug_id || ''}"`);
  });

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
