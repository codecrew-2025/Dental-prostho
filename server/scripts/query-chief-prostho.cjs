const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function main() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.db.collection('users');

  const prosthoChief = await users.find({
    role: { $in: ['chief-doctor', 'chief'] },
    department: { $regex: /prostho|protho|prosth/i },
  }).project({ name: 1, email: 1, role: 1, Identity: 1, department: 1, createdAt: 1 }).toArray();

  console.log('=== Chief doctors — Prosthodontics ===');
  if (!prosthoChief.length) {
    console.log('NONE FOUND');
  } else {
    prosthoChief.forEach((u) => console.log(JSON.stringify(u, null, 2)));
  }

  const allChief = await users.find({
    role: { $in: ['chief-doctor', 'chief'] },
  }).project({ name: 1, email: 1, role: 1, Identity: 1, department: 1 }).toArray();

  console.log('\n=== All chief doctors (any department) ===');
  console.log(`Total: ${allChief.length}`);
  allChief.forEach((u) => {
    console.log(`  [${u.role}] ${u.name} | ${u.Identity} | dept=${u.department || '—'} | ${u.email}`);
  });

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
