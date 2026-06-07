/**
 * Repair appointments that have an approved GeneralCase assignment but missing PG/UG link fields.
 * Run: node server/scripts/sync-assigned-appointments.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const GeneralCase = (await import('../models/GeneralCase.js')).default;
  const Appointment = (await import('../models/AppoitmentBooked.js')).default;

  const cases = await GeneralCase.find({
    assignedPgId: { $exists: true, $ne: '' },
    specialistStatus: 'approved',
  }).lean();

  let updated = 0;
  for (const caseItem of cases) {
    const patientId = String(caseItem.patientId || '').trim();
    const assignedPgId = String(caseItem.assignedPgId || '').trim();
    const specialistDoctorId = String(caseItem.specialistDoctorId || '').trim();
    if (!patientId || !assignedPgId) continue;

    const appt = await Appointment.findOne({
      patientId,
      status: { $nin: ['cancelled', 'completed', 'closed'] },
    }).sort({ createdAt: -1 });

    if (!appt) continue;

    const needsUpdate =
      String(appt.doctorId || '') !== assignedPgId ||
      String(appt.assigned_pg_ug_id || '') !== assignedPgId ||
      appt.status === 'pending';

    if (!needsUpdate) continue;

    appt.status = 'assigned';
    appt.isProcessed = true;
    appt.doctorId = assignedPgId;
    appt.assignedPgUgId = assignedPgId;
    appt.assigned_pg_ug_id = assignedPgId;
    appt.pgDoctorId = assignedPgId;
    if (specialistDoctorId) {
      appt.supervisingDeptDoctorId = specialistDoctorId;
      appt.supervising_dept_doctor_id = specialistDoctorId;
      appt.deptDoctorId = specialistDoctorId;
    }
    await appt.save();
    updated += 1;
    console.log(`Synced ${appt.bookingId} -> ${assignedPgId}`);
  }

  console.log(`Done. Updated ${updated} appointment(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
