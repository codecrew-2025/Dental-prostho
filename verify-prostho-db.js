// verify-prostho-db.js - Verify Prosthodontics assignment database state
import mongoose from 'mongoose';
import { User } from './server/models/User.js';
import Appointment from './server/models/AppoitmentBooked.js';

const MONGO_URI = 'mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0';

async function verifyProsthoDatabase() {
  try {
    console.log('════════════════════════════════════════════════════════');
    console.log('STEP 3 — Verify department field on PG/UG users');
    console.log('════════════════════════════════════════════════════════\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all PG/UG users
    console.log('🔍 Finding all PG/UG users...\n');
    const pgUgUsers = await User.find(
      { role: { $in: ['pg', 'ug'] } },
      { name: 1, email: 1, role: 1, department: 1, departmentName: 1, Identity: 1 }
    ).lean();

    console.log(`Found ${pgUgUsers.length} PG/UG users:`);
    console.log(JSON.stringify(pgUgUsers, null, 2));
    console.log('\n');

    // Find Prosthodontics department
    console.log('🔍 Finding Prosthodontics department...\n');
    const Department = mongoose.model('Department');
    const prosthodDept = await Department.findOne(
      { name: /prostho/i },
      { _id: 1, name: 1 }
    ).lean();

    if (prosthodDept) {
      console.log('✅ Prosthodontics department found:');
      console.log(JSON.stringify(prosthodDept, null, 2));
      console.log(`\nPROSTHO_DEPT_ID = ${prosthodDept._id}\n`);

      // Find PG/UG users in Prosthodontics
      console.log('🔍 Finding PG/UG users with department = PROSTHO_DEPT_ID...\n');
      const prosthodPgUg = await User.find(
        {
          role: { $in: ['pg', 'ug'] },
          department: prosthodDept._id
        },
        { name: 1, email: 1, department: 1, departmentName: 1, Identity: 1 }
      ).lean();

      console.log(`Found ${prosthodPgUg.length} PG/UG users in Prosthodontics:`);
      console.log(JSON.stringify(prosthodPgUg, null, 2));

      if (prosthodPgUg.length === 0) {
        console.log('\n❌ FAIL: No PG/UG users have department = PROSTHO_DEPT_ID');
        console.log('PG/UG users are not tagged to Prostho in the database.');
      } else {
        console.log('\n✅ PASS: PG/UG users found in Prosthodontics department');
      }
    } else {
      console.log('❌ No Prosthodontics department found in database');
    }

    console.log('\n════════════════════════════════════════════════════════');
    console.log('STEP 4 — Verify referralDepartment on appointments');
    console.log('════════════════════════════════════════════════════════\n');

    const assignedAppointment = await Appointment.findOne(
      { status: 'assigned' },
      { bookingId: 1, referralDepartment: 1, assignedPgUgId: 1, supervisingDeptDoctorId: 1, patientId: 1 }
    ).lean();

    if (assignedAppointment) {
      console.log('✅ Found assigned appointment:');
      console.log(JSON.stringify(assignedAppointment, null, 2));

      if (assignedAppointment.referralDepartment) {
        console.log('\n✅ PASS: referralDepartment field is saved on appointment');
      } else {
        console.log('\n❌ FAIL: referralDepartment is null or missing');
      }

      // Check assigned PG/UG
      if (assignedAppointment.assignedPgUgId) {
        const assignedPg = await User.findOne(
          { Identity: assignedAppointment.assignedPgUgId },
          { name: 1, department: 1, departmentName: 1, Identity: 1 }
        ).lean();

        if (assignedPg) {
          console.log('\n📋 Assigned PG/UG details:');
          console.log(JSON.stringify(assignedPg, null, 2));
          console.log(`Department: ${assignedPg.departmentName || 'N/A'}`);
        }
      }

      // Check supervising doctor
      if (assignedAppointment.supervisingDeptDoctorId) {
        const deptDoctor = await User.findOne(
          { Identity: assignedAppointment.supervisingDeptDoctorId },
          { name: 1, department: 1, departmentName: 1, Identity: 1, isDeptDoctor: 1 }
        ).lean();

        if (deptDoctor) {
          console.log('\n📋 Supervising Dept Doctor details:');
          console.log(JSON.stringify(deptDoctor, null, 2));
          console.log(`Department: ${deptDoctor.departmentName || 'N/A'}`);
        }
      }
    } else {
      console.log('ℹ️  No assigned appointments found in database');
    }

    console.log('\n════════════════════════════════════════════════════════');
    console.log('Database Verification Complete');
    console.log('════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

verifyProsthoDatabase();
