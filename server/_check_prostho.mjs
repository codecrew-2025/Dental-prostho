import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

await mongoose.connect(process.env.MONGO_URI);

const User = (await import('./models/User.js')).default || (await import('./models/User.js')).User || mongoose.model('User');
const Appointment = (await import('./models/AppoitmentBooked.js')).default || mongoose.model('AppointmentBooked');
const GeneralCase = (await import('./models/GeneralCase.js')).default || mongoose.model('GeneralCase');

const prosthoUsers = await User.find({ department: 'prosthodontics' }).lean();
const prosthoIdentities = prosthoUsers.map(u => String(u.Identity || '').trim()).filter(Boolean);
const prosthoIds = prosthoUsers.map(u => String(u._id));

console.log('Prosthodontics Users:', prosthoIdentities);

const allIdentities = [...prosthoIdentities, ...prosthoIds];

// Find appointments assigned to these users
const appts = await Appointment.find({
  $or: [
    { supervisingDeptDoctorId: { $in: allIdentities } },
    { supervising_dept_doctor_id: { $in: allIdentities } },
    { deptDoctorId: { $in: allIdentities } },
    { assignedPgUgId: { $in: allIdentities } },
    { assigned_pg_ug_id: { $in: allIdentities } },
    { pgDoctorId: { $in: allIdentities } },
    { doctorId: { $in: allIdentities } }
  ]
}).lean();

console.log('Appointments directly assigned to Prostho identities:', appts.length);

const cases = await GeneralCase.find({
  $or: [
    { assignedPgId: { $in: allIdentities } },
    { specialistDoctorId: { $in: allIdentities } }
  ]
}).lean();

console.log('General Cases assigned to Prostho:', cases.length);

console.log('Would update these records to null/pending or delete them based on requirements.');
process.exit(0);
