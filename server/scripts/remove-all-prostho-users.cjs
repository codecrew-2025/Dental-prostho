/**
 * Remove ALL users with a prosthodontics department (any role).
 * Run: node server/scripts/remove-all-prostho-users.cjs
 * Dry run: node server/scripts/remove-all-prostho-users.cjs --dry-run
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

  const toRemove = await users
    .find({ department: { $regex: PROSTHO_PATTERN } })
    .project({ name: 1, email: 1, Identity: 1, role: 1, department: 1 })
    .toArray();

  console.log(`Found ${toRemove.length} prosthodontics user(s) to remove:\n`);
  toRemove.forEach((u) => {
    console.log(`  - [${u.role}] ${u.name} | ${u.email} | ${u.Identity}`);
  });

  if (!toRemove.length) {
    console.log('\nNothing to remove.');
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes made.');
    await mongoose.disconnect();
    return;
  }

  const ids = toRemove.map((u) => u._id);
  const result = await users.deleteMany({ _id: { $in: ids } });
  console.log(`\n✅ Deleted ${result.deletedCount} prosthodontics user(s).`);

  const remaining = await users.countDocuments({ department: { $regex: PROSTHO_PATTERN } });
  console.log(`Remaining prosthodontics users: ${remaining}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
