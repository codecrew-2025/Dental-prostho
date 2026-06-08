import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import { Appointment } from '../models/AppoitmentBooked.js';
import GeneralCase from '../models/GeneralCase.js';
import { User } from '../models/User.js';

const run = async () => {
  try {
    await connectDB();

    // Use patientId from conversation
    const patientId = '2603017';

    // Find or create a doctor
    let doctor = await User.findOne({ role: 'doctor' }).lean();
    if (!doctor) {
      const created = await User.create({ name: 'Dr Test', role: 'doctor', Identity: 'DOCTEST1' });
      doctor = created.toObject();
      console.log('Created doctor:', doctor.Identity || doctor._id);
    }

    // Find or create a PG
    let pg = await User.findOne({ role: { $in: ['pg', 'ug'] } }).lean();
    if (!pg) {
      const created = await User.create({ name: 'PG Test', role: 'pg', Identity: 'PGTEST1', createdBy: doctor._id });
      pg = created.toObject();
      console.log('Created PG:', pg.Identity || pg._id);
    }

    const pgIdentity = String(pg.Identity || pg._id).trim();

    // Create a GeneralCase referring to prosthodontics and assigned to PG
    const gc = new GeneralCase({
      patientId,
      patientName: 'Test Patient',
      doctorId: String(doctor._id),
      doctorName: doctor.name || 'Dr Test',
      chiefComplaint: 'Dental Caries',
      referredDepartment: 'prosthodontics',
      specialistStatus: 'approved',
      assignedPgId: pgIdentity,
      assignedPgName: pg.name || 'PG Test',
      pgAssignedAt: new Date(),
    });
    await gc.save();
    console.log('Inserted GeneralCase id:', gc._id.toString());

    // Create an appointment for the patient (chiefComplaint intentionally blank-ish to test fallback)
    const bookingId = `TEST-${Date.now()}`;
    const appt = new Appointment({
      bookingId,
      patientId,
      patientEmail: 'test+pgflow@example.com',
      generalDoctorId: String(doctor._id),
      doctorId: String(doctor._id),
      chiefComplaint: ' ', // satisfies required but trimmed to empty
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '10:00',
      status: 'pending',
      assigned_pg_ug_id: pgIdentity,
      assignedPgUgId: pgIdentity,
    });
    await appt.save();
    console.log('Inserted Appointment bookingId:', bookingId);

    // Now run the PG-style query to fetch appointments for this PG
    const GeneralCaseModel = GeneralCase;
    const assignedCases = await GeneralCaseModel.find({ specialistStatus: 'approved', $or: [{ assignedPgId: pgIdentity }, { assignedPgId: pg._id }] }, { patientId: 1 }).lean();
    const assignedPatientIds = [...new Set(assignedCases.map(c => String(c.patientId || '').trim()).filter(Boolean))];

    const foundAppointments = await Appointment.find({ $or: [ { patientId: { $in: assignedPatientIds } }, { doctorId: pgIdentity }, { assigned_pg_ug_id: pgIdentity }, { pgDoctorId: pgIdentity } ] }).lean();

    console.log('Assigned patient IDs:', assignedPatientIds);
    console.log('Found appointments count:', foundAppointments.length);
    foundAppointments.forEach(a => {
      console.log('->', { bookingId: a.bookingId, patientId: a.patientId, chiefComplaint: a.chiefComplaint, assigned_pg_ug_id: a.assigned_pg_ug_id });
    });

    // Also show fallback chief complaint from GeneralCase
    const latestCase = await GeneralCaseModel.findOne({ patientId }).sort({ createdAt: -1 }).lean();
    console.log('Latest GeneralCase chiefComplaint:', latestCase?.chiefComplaint || null);

    process.exit(0);
  } catch (err) {
    console.error('Error in test-pg-flow:', err);
    process.exit(2);
  }
};

run();
