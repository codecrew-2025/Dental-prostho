const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function main() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.db.collection('users');

  const prosthoUsers = await users.find({
    department: { $regex: /prostho|protho|prosth/i },
  }).project({ name: 1, email: 1, role: 1, Identity: 1, department: 1 }).toArray();

  console.log('=== Prosthodontics Users ===');
  prosthoUsers.forEach((u) => {
    console.log(`  [${u.role}] ${u.name} | ${u.Identity} | ${u.email}`);
  });

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
