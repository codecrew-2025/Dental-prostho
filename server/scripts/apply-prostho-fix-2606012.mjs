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

  console.log(`Searching for the latest OralCase submitted today for patient ${patientId}...`);
  const latestOralCase = await OralCase.findOne({ patientId }).sort({ createdAt: -1 });

  if (!latestOralCase) {
    console.error('❌ No OralCase found for patient 2606012');
    process.exit(1);
  }

  console.log(`Found latest OralCase ${latestOralCase._id} created at ${latestOralCase.createdAt}`);

  // 1. Update OralCase to set referral fields
  latestOralCase.referredDepartment = 'Prosthodontics';
  await latestOralCase.save();
  console.log(`✅ Updated OralCase referredDepartment to 'Prosthodontics'`);

  // Check if a GeneralCase already exists for this referral today
  const existingGenCase = await GeneralCase.findOne({
    patientId,
    referredDepartment: 'Prosthodontics',
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });

  let genCaseId;
  if (existingGenCase) {
    console.log(`GeneralCase already exists for today: ${existingGenCase._id}`);
    genCaseId = existingGenCase._id;
  } else {
    // 2. Create the GeneralCase referral
    const generalCase = new GeneralCase({
      patientId: latestOralCase.patientId,
      patientName: latestOralCase.patientName,
      doctorId: latestOralCase.doctorId,
      doctorName: latestOralCase.doctorName,
      generalDoctorId: latestOralCase.doctorId,
      generalDoctorName: latestOralCase.doctorName,
      chiefComplaint: latestOralCase.chiefComplaint || '',
      presentIllness: latestOralCase.historyOfPresentIllness || '',
      pastMedical: latestOralCase.pastMedicalHistory || '',
      pastDental: latestOralCase.pastDentalHistory || '',
      personalHistory: latestOralCase.personalHistory || '',
      familyHistory: latestOralCase.familyHistory || '',
      clinicalFindings: latestOralCase.summary || '',
      provisionalDiagnosis: latestOralCase.provisionalDiagnosis || '',
      investigations: latestOralCase.invRadiologicalNotes || '',
      finalDiagnosis: latestOralCase.clinicalDiagnosis || '',
      description: '',
      generalDescription: latestOralCase.summary || '',
      selectedDepartments: ['Prosthodontics'],
      referralCurrentIndex: 0,
      referralHistory: [],
      referralCompletedAt: null,
      treatmentPlan: latestOralCase.treatmentPlan || '',
      xrayImage: '', // Can be filled if they uploaded one
      referredDepartment: 'Prosthodontics',
      specialistDoctorId: 'DNT01', // Ravi (Prostho Specialist)
      specialistDoctorName: 'Ravi',
      specialistAssignedAt: new Date(),
      specialistStatus: 'pending', // Pending PG assignment by department doctor/chief
      assignedPgId: '',
      assignedPgName: '',
      pgAssignedAt: null,
      chiefApproval: ''
    });

    await generalCase.save();
    console.log(`✅ Created new GeneralCase referral: ${generalCase._id}`);
    genCaseId = generalCase._id;
  }

  // 3. Update the active appointment for today (June 23, 2026) to route it to Prosthodontics
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`Searching for patient ${patientId}'s active appointment for today (${todayStr})...`);
  const activeAppt = await Appointment.findOne({
    patientId,
    appointmentDate: todayStr,
    status: { $nin: ['cancelled', 'completed', 'closed'] }
  });

  if (activeAppt) {
    console.log(`Found active appointment: ${activeAppt.bookingId}`);
    activeAppt.status = 'pending';
    activeAppt.isProcessed = false;
    activeAppt.currentDepartment = 'Prosthodontics';
    activeAppt.deptDoctorId = 'DNT01';
    activeAppt.supervisingDeptDoctorId = 'DNT01';
    activeAppt.supervising_dept_doctor_id = 'DNT01';
    activeAppt.doctorId = '';
    activeAppt.assignedPgUgId = '';
    activeAppt.assigned_pg_ug_id = '';
    activeAppt.pgDoctorId = '';
    activeAppt.generalDoctorId = latestOralCase.doctorId;

    await activeAppt.save();
    console.log(`✅ Successfully updated appointment ${activeAppt.bookingId} and routed it to Prosthodontics department`);
  } else {
    console.log(`❌ No active appointment found for patient ${patientId} on today's date (${todayStr}). Checking for any upcoming active appointments...`);
    const upcomingAppt = await Appointment.findOne({
      patientId,
      appointmentDate: { $gte: todayStr },
      status: { $nin: ['cancelled', 'completed', 'closed'] }
    }).sort({ appointmentDate: 1 });

    if (upcomingAppt) {
      console.log(`Found upcoming appointment: ${upcomingAppt.bookingId} on ${upcomingAppt.appointmentDate}`);
      upcomingAppt.status = 'pending';
      upcomingAppt.isProcessed = false;
      upcomingAppt.currentDepartment = 'Prosthodontics';
      upcomingAppt.deptDoctorId = 'DNT01';
      upcomingAppt.supervisingDeptDoctorId = 'DNT01';
      upcomingAppt.supervising_dept_doctor_id = 'DNT01';
      upcomingAppt.doctorId = '';
      upcomingAppt.assignedPgUgId = '';
      upcomingAppt.assigned_pg_ug_id = '';
      upcomingAppt.pgDoctorId = '';
      upcomingAppt.generalDoctorId = latestOralCase.doctorId;

      await upcomingAppt.save();
      console.log(`✅ Successfully updated appointment ${upcomingAppt.bookingId} and routed it to Prosthodontics department`);
    } else {
      console.log(`❌ No upcoming active appointments found to route`);
    }
  }

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
