import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import GeneralCase from '../models/GeneralCase.js';

const run = async () => {
  await connectDB();
  const patientId = '2603017';
  const cases = await GeneralCase.find({ patientId }).sort({ createdAt: -1 }).lean();
  console.log('Found', cases.length, 'GeneralCase entries for', patientId);
  cases.slice(0,20).forEach(c => {
    console.log({ id: String(c._id), createdAt: c.createdAt, assignedPgId: c.assignedPgId, chiefComplaint: c.chiefComplaint });
  });
  process.exit(0);
};

run();
