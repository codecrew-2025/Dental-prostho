/**
 * Remove all prosthodontics department doctors from the database.
 * Keeps test users (email matching test_*@clinic.com) so QA flow still works.
 *
 * Run: node server/scripts/remove-prostho-doctors.cjs
 * Dry run: node server/scripts/remove-prostho-doctors.cjs --dry-run
 */
const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');

const PROSTHO_PATTERN = /prostho|protho|prosth/i;

async function main() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection('users');

  const candidates = await users
    .find({
      role: 'doctor',
      department: { $regex: PROSTHO_PATTERN },
    })
    .project({ name: 1, email: 1, Identity: 1, department: 1, isDeptDoctor: 1, isGeneralDoctor: 1 })
    .toArray();

  console.log(`Found ${candidates.length} prosthodontics doctor(s):\n`);
  candidates.forEach((u) => {
    console.log(`  - ${u.name} | ${u.email} | ${u.Identity} | dept=${u.department}`);
  });

  const toRemove = candidates.filter((u) => !/^test_.*@clinic\.com$/i.test(String(u.email || '')));

  if (!toRemove.length) {
    console.log('\nNo non-test prosthodontics doctors to remove.');
    await mongoose.disconnect();
    return;
  }

  console.log(`\nWill remove ${toRemove.length} doctor(s) (keeping test_*@clinic.com users):\n`);
  toRemove.forEach((u) => console.log(`  ✗ ${u.name} (${u.email})`));

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes made.');
    await mongoose.disconnect();
    return;
  }

  const ids = toRemove.map((u) => u._id);
  const result = await users.deleteMany({ _id: { $in: ids } });
  console.log(`\n✅ Deleted ${result.deletedCount} prosthodontics doctor(s).`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
