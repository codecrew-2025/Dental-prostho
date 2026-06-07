/**
 * Set password to 123456 for all Prosthodontics team accounts.
 * Run: node server/scripts/set-prostho-passwords.cjs
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const NEW_PASSWORD = '123456';
const PROSTHO_IDENTITIES = ['CDNT01', 'DNT01', 'PGDNT01', 'UGDNT01'];

async function main() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.db.collection('users');

  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);
  const targets = await users
    .find({ Identity: { $in: PROSTHO_IDENTITIES } })
    .project({ name: 1, Identity: 1, role: 1, email: 1 })
    .toArray();

  if (!targets.length) {
    console.log('No prosthodontics team users found.');
    await mongoose.disconnect();
    return;
  }

  const result = await users.updateMany(
    { Identity: { $in: PROSTHO_IDENTITIES } },
    { $set: { password: hashed } }
  );

  console.log(`✅ Updated password to "${NEW_PASSWORD}" for ${result.modifiedCount} account(s):\n`);
  targets.forEach((u) => {
    console.log(`  [${u.role}] ${u.Identity} — ${u.email}`);
  });

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
