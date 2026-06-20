// server/utils/patientIdGenerator.js
import { User } from '../models/User.js';
import { PatientDetails } from '../models/patientDetails.js';

// Generate next patient ID in format YYMMNNN (e.g., 2607001)
export const generateNextPatientId = async () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);  // "26"
  const mm = String(now.getMonth() + 1).padStart(2, '0');  // "07"
  const prefix = `${yy}${mm}`;  // "2607"

  // Find latest IDs from both User (Identity) and PatientDetails (patientId) with this prefix
  const [lastUser, lastPatient] = await Promise.all([
    User.findOne({ 
      Identity: { $regex: `^${prefix}\\d{3}$` }, 
      role: 'patient' 
    })
      .sort({ Identity: -1 })
      .lean(),
    PatientDetails.findOne({ 
      patientId: { $regex: `^${prefix}\\d{3}$` } 
    })
      .sort({ patientId: -1 })
      .lean(),
  ]);

  let lastId = null;
  if (lastUser) lastId = lastUser.Identity;
  if (lastPatient && (!lastId || lastPatient.patientId > lastId)) {
    lastId = lastPatient.patientId;
  }

  let nextSequence = 1;
  if (lastId) {
    const lastSequence = parseInt(lastId.slice(-3), 10); // Get last 3 digits
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  if (nextSequence > 999) {
    throw new Error('Maximum patient IDs reached for this month (999)');
  }

  const sequence = String(nextSequence).padStart(3, '0');
  return `${prefix}${sequence}`;
};

export default generateNextPatientId;