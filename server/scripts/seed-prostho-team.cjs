/**
 * Create Prosthodontics department doctor (DNT01) + 1 PG + 1 UG under them.
 * Run: node server/scripts/seed-prostho-team.cjs
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const TEAM = {
  doctor: {
    name: 'Prosthodontics Department Doctor',
    email: 'prostho.dept@clinic.com',
    phone: '9876500001',
    Identity: 'DNT01',
    role: 'doctor',
    department: 'prosthodontics',
    isGeneralDoctor: false,
    isDeptDoctor: true,
  },
  pg: {
    name: 'Prosthodontics PG',
    email: 'prostho.pg@clinic.com',
    phone: '9876500002',
    Identity: 'PGDNT01',
    role: 'pg',
    department: 'prosthodontics',
  },
  ug: {
    name: 'Prosthodontics UG',
    email: 'prostho.ug@clinic.com',
    phone: '9876500003',
    Identity: 'UGDNT01',
    role: 'ug',
    department: 'prosthodontics',
  },
};

const DEFAULT_PASSWORD = '123456';
const IDENTITIES = [TEAM.doctor.Identity, TEAM.pg.Identity, TEAM.ug.Identity];

async function main() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection('users');

  const existing = await users
    .find({ $or: [{ Identity: { $in: IDENTITIES } }, { email: { $in: Object.values(TEAM).map((u) => u.email) } }] })
    .project({ Identity: 1, email: 1, role: 1 })
    .toArray();

  if (existing.length) {
    console.log('Removing existing users with conflicting Identity/email:');
    existing.forEach((u) => console.log(`  - [${u.role}] ${u.Identity} ${u.email}`));
    await users.deleteMany({ _id: { $in: existing.map((u) => u._id) } });
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const deptDoctorId = new mongoose.Types.ObjectId();
  const pgId = new mongoose.Types.ObjectId();
  const ugId = new mongoose.Types.ObjectId();
  const now = new Date();

  const records = [
    { _id: deptDoctorId, ...TEAM.doctor, password: hashedPassword, createdAt: now },
    { _id: pgId, ...TEAM.pg, password: hashedPassword, createdBy: deptDoctorId, createdAt: now },
    { _id: ugId, ...TEAM.ug, password: hashedPassword, createdBy: deptDoctorId, createdAt: now },
  ];

  await users.insertMany(records);

  console.log('\n✅ Prosthodontics team created\n');
  console.log('Password for all accounts:', DEFAULT_PASSWORD);
  console.log('');
  records.forEach((u) => {
    console.log(`  [${u.role.toUpperCase()}] ${u.name}`);
    console.log(`    Identity: ${u.Identity}`);
    console.log(`    Email:    ${u.email}`);
    console.log(`    MongoId:  ${u._id}`);
    if (u.createdBy) console.log(`    Supervised by: DNT01`);
    console.log('');
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
