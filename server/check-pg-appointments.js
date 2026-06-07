import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Import models
import Appointment from './models/AppoitmentBooked.js';
import GeneralCase from './models/GeneralCase.js';
import { User } from './models/User.js';

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');

async function checkPGAppointments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all prosthodontics PG/UG users
    console.log('Finding Prosthodontics PG/UG users...');
    const pgUsers = await User.find(
      { role: { $in: ['pg', 'ug'] } },
      { _id: 1, name: 1, Identity: 1, department: 1, role: 1 }
    ).lean();

    const prosthoPGs = pgUsers.filter(pg => 
      normalizeDepartment(pg.department) === 'prosthodontics'
    );

    console.log(`Found ${prosthoPGs.length} Prosthodontics PG/UG users:`);
    prosthoPGs.forEach(pg => {
      console.log(`  - ${pg.name} (${pg.Identity}) - ${pg.role} - ${pg.department}`);
    });
    console.log('');

    // Check GeneralCase assignments for each PG
    for (const pg of prosthoPGs) {
      const pgIdentity = String(pg.Identity || '').trim();
      console.log(`\n📋 Checking GeneralCase assignments for PG: ${pg.name} (${pgIdentity})`);
      
      const assignedCases = await GeneralCase.find(
        { assignedPgId: pgIdentity },
        { patientId: 1, patientName: 1, specialistStatus: 1, assignedPgId: 1, referredDepartment: 1, createdAt: 1 }
      ).lean();

      console.log(`   Found ${assignedCases.length} cases assigned to this PG`);
      
      if (assignedCases.length > 0) {
        assignedCases.forEach((c, idx) => {
          console.log(`   Case ${idx + 1}:`);
          console.log(`     - Patient ID: ${c.patientId}`);
          console.log(`     - Patient Name: ${c.patientName}`);
          console.log(`     - Specialist Status: ${c.specialistStatus}`);
          console.log(`     - Referred Department: ${c.referredDepartment}`);
          console.log(`     - Created: ${c.createdAt}`);
        });

        // Check appointments for these patients
        const patientIds = assignedCases.map(c => c.patientId);
        console.log(`\n   🔍 Checking appointments for these ${patientIds.length} patients...`);

        const appointments = await Appointment.find(
          { patientId: { $in: patientIds } },
          { 
            bookingId: 1, 
            patientId: 1, 
            status: 1, 
            appointmentDate: 1, 
            appointmentTime: 1,
            doctorId: 1,
            assignedPgUgId: 1,
            assigned_pg_ug_id: 1,
            pgDoctorId: 1,
            supervisingDeptDoctorId: 1,
            supervising_dept_doctor_id: 1,
            deptDoctorId: 1,
            createdAt: 1
          }
        ).lean();

        console.log(`   Found ${appointments.length} total appointments for these patients`);
        
        appointments.forEach((appt, idx) => {
          console.log(`   Appointment ${idx + 1}:`);
          console.log(`     - Booking ID: ${appt.bookingId}`);
          console.log(`     - Patient ID: ${appt.patientId}`);
          console.log(`     - Status: ${appt.status}`);
          console.log(`     - Date: ${appt.appointmentDate}`);
          console.log(`     - Time: ${appt.appointmentTime}`);
          console.log(`     - doctorId: ${appt.doctorId || 'NOT SET'}`);
          console.log(`     - assignedPgUgId: ${appt.assignedPgUgId || 'NOT SET'}`);
          console.log(`     - assigned_pg_ug_id: ${appt.assigned_pg_ug_id || 'NOT SET'}`);
          console.log(`     - pgDoctorId: ${appt.pgDoctorId || 'NOT SET'}`);
          console.log(`     - supervisingDeptDoctorId: ${appt.supervisingDeptDoctorId || 'NOT SET'}`);
          console.log(`     - supervising_dept_doctor_id: ${appt.supervising_dept_doctor_id || 'NOT SET'}`);
          console.log(`     - deptDoctorId: ${appt.deptDoctorId || 'NOT SET'}`);
        });

        // Now run the actual pg-appointments query to see what would be returned
        console.log(`\n   🔍 Running actual PG appointments query for ${pgIdentity}...`);
        
        const approvedCases = assignedCases.filter(c => c.specialistStatus === 'approved');
        const approvedPatientIds = approvedCases.map(c => c.patientId);
        
        console.log(`   - Cases with specialistStatus='approved': ${approvedCases.length}`);
        console.log(`   - Patient IDs with approved status: ${approvedPatientIds.join(', ')}`);

        const todayStr = new Date().toISOString().split("T")[0];
        const orClauses = [
          { doctorId: pgIdentity },
          { assigned_pg_ug_id: pgIdentity },
          { pgDoctorId: pgIdentity },
          { assignedPgUgId: pgIdentity },
        ];

        if (approvedPatientIds.length > 0) {
          orClauses.unshift({ patientId: { $in: approvedPatientIds } });
        }

        const appointmentQuery = {
          $or: orClauses,
          status: { $nin: ['cancelled'] },
          appointmentDate: { $gte: todayStr },
        };

        console.log(`\n   Query:`, JSON.stringify(appointmentQuery, null, 2));

        const matchedAppointments = await Appointment.find(appointmentQuery).lean();
        console.log(`\n   ✅ Query returned ${matchedAppointments.length} appointments`);
        
        if (matchedAppointments.length > 0) {
          matchedAppointments.forEach((appt, idx) => {
            console.log(`   Matched Appointment ${idx + 1}:`);
            console.log(`     - Booking ID: ${appt.bookingId}`);
            console.log(`     - Patient ID: ${appt.patientId}`);
            console.log(`     - Status: ${appt.status}`);
            console.log(`     - Date: ${appt.appointmentDate}`);
          });
        } else {
          console.log(`   ❌ No appointments matched the query!`);
          console.log(`\n   Debugging why:`);
          console.log(`   - approvedPatientIds count: ${approvedPatientIds.length}`);
          console.log(`   - Total appointments for these patients: ${appointments.length}`);
          
          appointments.forEach((appt, idx) => {
            const matchesPatientId = approvedPatientIds.includes(appt.patientId);
            const matchesDoctorId = appt.doctorId === pgIdentity;
            const matchesAssignedPgUgId = appt.assignedPgUgId === pgIdentity;
            const matchesAssigned_pg_ug_id = appt.assigned_pg_ug_id === pgIdentity;
            const matchesPgDoctorId = appt.pgDoctorId === pgIdentity;
            const notCancelled = appt.status !== 'cancelled';
            const futureDate = appt.appointmentDate >= todayStr;
            
            console.log(`\n   Appointment ${idx + 1} (${appt.bookingId}):`);
            console.log(`     ✓/✗ matchesPatientId: ${matchesPatientId}`);
            console.log(`     ✓/✗ matchesDoctorId: ${matchesDoctorId}`);
            console.log(`     ✓/✗ matchesAssignedPgUgId: ${matchesAssignedPgUgId}`);
            console.log(`     ✓/✗ matchesAssigned_pg_ug_id: ${matchesAssigned_pg_ug_id}`);
            console.log(`     ✓/✗ matchesPgDoctorId: ${matchesPgDoctorId}`);
            console.log(`     ✓/✗ notCancelled: ${notCancelled}`);
            console.log(`     ✓/✗ futureDate (${appt.appointmentDate} >= ${todayStr}): ${futureDate}`);
            
            const matchesAnyPgField = matchesDoctorId || matchesAssignedPgUgId || matchesAssigned_pg_ug_id || matchesPgDoctorId;
            const meetsAllCriteria = (matchesPatientId || matchesAnyPgField) && notCancelled && futureDate;
            
            console.log(`     OVERALL MATCH: ${meetsAllCriteria ? '✅ YES' : '❌ NO'}`);
          });
        }
      }
    }

    console.log('\n\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPGAppointments();
