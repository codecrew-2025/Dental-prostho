/**
 * Create Prosthodontics chief doctor (CDNT01) and assign DNT01 under them.
 * Run: node server/scripts/seed-prostho-chief.cjs
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const CHIEF = {
  name: 'Prosthodontics Chief Doctor',
  email: 'prostho.chief@clinic.com',
  phone: '9876500000',
  Identity: 'CDNT01',
  role: 'chief-doctor',
  department: 'prosthodontics',
};

const DEPT_DOCTOR_IDENTITY = 'DNT01';
const DEFAULT_PASSWORD = '123456';

async function main() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.db.collection('users');

  let chief = await users.findOne({
    $or: [{ Identity: CHIEF.Identity }, { email: CHIEF.email }],
  });

  if (!chief) {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const chiefId = new mongoose.Types.ObjectId();
    const doc = {
      _id: chiefId,
      ...CHIEF,
      password: hashedPassword,
      isGeneralDoctor: false,
      isDeptDoctor: false,
      createdAt: new Date(),
    };
    await users.insertOne(doc);
    chief = doc;
    console.log('✅ Created chief doctor CDNT01');
  } else {
    await users.updateOne(
      { _id: chief._id },
      {
        $set: {
          role: 'chief-doctor',
          department: 'prosthodontics',
          name: CHIEF.name,
          Identity: CHIEF.Identity,
        },
      }
    );
    console.log('✅ Chief doctor CDNT01 already exists — updated role/department');
  }

  const deptDoctor = await users.findOne({ Identity: DEPT_DOCTOR_IDENTITY, role: 'doctor' });
  if (!deptDoctor) {
    console.error(`❌ Department doctor ${DEPT_DOCTOR_IDENTITY} not found. Run seed-prostho-team.cjs first.`);
    process.exit(1);
  }

  await users.updateOne(
    { _id: deptDoctor._id },
    { $set: { createdBy: chief._id, department: 'prosthodontics', isDeptDoctor: true } }
  );

  console.log(`✅ Assigned ${DEPT_DOCTOR_IDENTITY} under chief CDNT01\n`);
  console.log('Hierarchy:');
  console.log(`  CDNT01 (chief-doctor) — ${CHIEF.email}`);
  console.log(`    └── DNT01 (dept doctor) — ${deptDoctor.email}`);
  console.log(`          ├── PGDNT01`);
  console.log(`          └── UGDNT01`);
  console.log('\nPassword (chief):', DEFAULT_PASSWORD);

  const verify = await users.findOne({ Identity: DEPT_DOCTOR_IDENTITY }, { createdBy: 1, Identity: 1, name: 1 });
  console.log('\nVerify DNT01.createdBy =', String(verify.createdBy), '(chief _id:', String(chief._id) + ')');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
