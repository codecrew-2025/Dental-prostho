import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import OralCase from '../models/Oral-model.js';

const run = async () => {
  await connectDB();
  const patientId = '2606012';

  console.log(`Searching all OralCases for patient ${patientId}...`);
  const cases = await OralCase.find({ patientId }).sort({ createdAt: -1 }).lean();
  console.log(`Found ${cases.length} cases:`);
  cases.forEach((c, i) => {
    console.log(`OralCase ${i + 1}:`, {
      _id: c._id,
      patientId: c.patientId,
      patientName: c.patientName,
      referredDepartment: c.referredDepartment,
      referralDepartments: c.referralDepartments,
      createdAt: c.createdAt,
    });
  });

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
