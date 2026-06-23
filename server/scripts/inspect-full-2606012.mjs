import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import Appointment from '../models/AppoitmentBooked.js';
import GeneralCase from '../models/GeneralCase.js';
import OralCase from '../models/Oral-model.js';

const run = async () => {
  await connectDB();
  const patientId = '2606012';

  console.log(`=== INVENTORING DATA FOR PATIENT ${patientId} ===`);

  console.log('\n--- Oral Cases ---');
  const oralCases = await OralCase.find({ patientId }).sort({ createdAt: -1 }).lean();
  console.log(`Found ${oralCases.length} OralCase(s):`);
  oralCases.forEach((c, i) => {
    console.log(`[OralCase ${i + 1}] ID: ${c._id}, Date: ${c.createdAt?.toISOString() || c.date}`);
    console.log(`  ReferredDept: "${c.referredDepartment}", ReferralDepts: ${JSON.stringify(c.referralDepartments)}`);
    console.log(`  ProvisionalDiag: "${c.provisionalDiagnosis}", ClinicalDiag: "${c.clinicalDiagnosis}"`);
  });

  console.log('\n--- General Cases ---');
  const generalCases = await GeneralCase.find({ patientId }).sort({ createdAt: -1 }).lean();
  console.log(`Found ${generalCases.length} GeneralCase(s):`);
  generalCases.forEach((c, i) => {
    console.log(`[GeneralCase ${i + 1}] ID: ${c._id}, Date: ${c.createdAt?.toISOString() || c.createdAt}`);
    console.log(`  ReferredDept: "${c.referredDepartment}", SelectedDepts: ${JSON.stringify(c.selectedDepartments)}`);
    console.log(`  Doctor: "${c.specialistDoctorName}" (${c.specialistDoctorId}), Status: "${c.specialistStatus}"`);
    console.log(`  Assigned PG: "${c.assignedPgName}" (${c.assignedPgId}), Stage: "${c.stage || ''}"`);
  });

  console.log('\n--- Appointments ---');
  const appointments = await Appointment.find({ patientId }).sort({ appointmentDate: -1, createdAt: -1 }).lean();
  console.log(`Found ${appointments.length} Appointment(s):`);
  appointments.forEach((a, i) => {
    console.log(`[Appointment ${i + 1}] ID: ${a.bookingId}, Date: ${a.appointmentDate}, Created: ${a.createdAt?.toISOString()}`);
    console.log(`  Dept: "${a.currentDepartment || a.department}", Status: "${a.status}", Processed: ${a.isProcessed}`);
    console.log(`  Doctor ID: "${a.doctorId || ''}", Assigned PG/UG: "${a.assignedPgUgId || a.assigned_pg_ug_id || ''}"`);
  });

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
