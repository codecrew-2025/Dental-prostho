import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const localUri = 'mongodb://127.0.0.1:27017/Dental';

// Define schemas inline or import them
import { User } from '../models/User.js';
import { Appointment } from '../models/AppoitmentBooked.js';
import GeneralCase from '../models/GeneralCase.js';
import OralCase from '../models/Oral-model.js';
import { PatientDetails } from '../models/patientDetails.js';

const seed = async () => {
  try {
    console.log(`Connecting to local MongoDB at ${localUri}...`);
    await mongoose.connect(localUri);
    console.log('✅ Connected successfully!');

    // 1. Seed Users
    const passwordHash = await bcrypt.hash('123456', 10);
    
    const userRecords = [
      {
        name: 'Admin User',
        email: 'admin@srmdental.com',
        phone: '9000000001',
        role: 'admin',
        Identity: 'AD001',
        staffId: 'AD001',
        password: passwordHash,
      },
      {
        name: 'NandhaKumar',
        email: 'bd040911@gmail.com',
        phone: '9876543210',
        role: 'chief-doctor',
        Identity: 'CDNT02',
        staffId: 'CDNT02',
        password: passwordHash,
        department: 'Oral',
        specialization: 'Oral Medicine and Radiology',
      },
      {
        name: 'Dr. Oral Doctor',
        email: 'oral.doctor@dental.com',
        phone: '9876543211',
        role: 'doctor',
        Identity: 'ORAL_DOC_001',
        staffId: 'ORAL_DOC_001',
        password: passwordHash,
        department: 'Oral',
        specialization: 'Oral Surgery',
      },
      {
        name: 'Test General Doctor',
        email: 'test_generaldoc@clinic.com',
        phone: '9876543212',
        role: 'doctor',
        Identity: 'TEST_GENDOC_001',
        staffId: 'TEST_GENDOC_001',
        password: passwordHash,
        department: 'general',
        isGeneralDoctor: true,
      },
      {
        name: 'Test PG Doctor',
        email: 'test_pg@clinic.com',
        phone: '9876543213',
        role: 'pg',
        Identity: 'TEST_PG_001',
        staffId: 'TEST_PG_001',
        password: passwordHash,
        department: 'prosthodontics',
      },
      {
        name: 'Patient Deepan',
        email: 'patient.deepan@dental.com',
        phone: '9876543214',
        role: 'patient',
        Identity: '2606012',
        password: passwordHash,
      }
    ];

    console.log('Seeding users...');
    for (const u of userRecords) {
      await User.deleteMany({ email: u.email });
      await User.deleteMany({ Identity: u.Identity });
      await User.create(u);
      console.log(`  - Seeded user: ${u.name} (${u.email})`);
    }

    // 2. Seed PatientDetails
    console.log('Seeding patient details...');
    await PatientDetails.deleteMany({ patientId: '2606012' });
    const patientDetail = await PatientDetails.create({
      patientId: '2606012',
      personalInfo: {
        firstName: 'Patient',
        lastName: 'Deepan',
        email: 'patient.deepan@dental.com',
        phone: '9876543214',
        age: 25,
        gender: 'Male',
        address: 'Chennai, India',
      }
    });
    console.log('  - Seeded patient details for patientId 2606012');

    // 3. Seed Appointments
    console.log('Seeding appointments...');
    await Appointment.deleteMany({ patientId: '2606012' });
    await Appointment.create([
      {
        bookingId: 'SRMDNT001',
        patientId: '2606012',
        patientEmail: 'patient.deepan@dental.com',
        chiefComplaint: 'Tooth pain on lower left jaw',
        appointmentDate: '2026-06-25',
        appointmentTime: '10:00 AM',
        status: 'assigned',
        currentDepartment: 'Oral',
        doctorId: 'ORAL_DOC_001',
        generalDoctorId: 'TEST_GENDOC_001',
      },
      {
        bookingId: 'SRMDNT002',
        patientId: '2606012',
        patientEmail: 'patient.deepan@dental.com',
        chiefComplaint: 'Bleeding gums',
        appointmentDate: '2026-06-26',
        appointmentTime: '11:00 AM',
        status: 'pending',
        currentDepartment: 'Oral',
        doctorId: 'ORAL_DOC_001',
        generalDoctorId: 'TEST_GENDOC_001',
      }
    ]);
    console.log('  - Seeded 2 appointments for patientId 2606012');

    // 4. Seed GeneralCase
    console.log('Seeding general cases...');
    await GeneralCase.deleteMany({ patientId: '2606012' });
    await GeneralCase.create({
      patientId: '2606012',
      patientName: 'Patient Deepan',
      doctorId: 'TEST_GENDOC_001',
      doctorName: 'Test General Doctor',
      chiefComplaint: 'Tooth pain on lower left jaw',
      provisionalDiagnosis: 'Chronic pulpitis',
      referredDepartment: 'Oral',
      specialistDoctorId: 'ORAL_DOC_001',
      specialistDoctorName: 'Dr. Oral Doctor',
      specialistStatus: 'approved',
      assignedPgId: 'TEST_PG_001',
      assignedPgName: 'Test PG Doctor',
    });
    console.log('  - Seeded 1 general case');

    // 5. Seed OralCase
    console.log('Seeding oral cases...');
    await OralCase.deleteMany({ patientId: '2606012' });
    await OralCase.create({
      patientId: '2606012',
      patientName: 'Patient Deepan',
      age: 25,
      gender: 'Male',
      doctorId: 'ORAL_DOC_001',
      doctorName: 'Dr. Oral Doctor',
      chiefComplaint: 'Tooth pain on lower left jaw',
      treatmentPlan: 'Root canal treatment',
      chiefApproval: 'Pending',
    });
    console.log('  - Seeded 1 oral case');

    console.log('\n✅ Local development database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
