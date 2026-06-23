// server/routes/Auth.js
import { User } from '../models/User.js';
import generateNextPatientId from '../utils/patientIdGenerator.js';
import generateRandomPassword from '../utils/passwordGenerator.js';
import { hash, compare } from 'bcryptjs';
import pkg from 'jsonwebtoken';
const { sign } = pkg;
import dotenv from 'dotenv';
import express,{ Router,json } from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';

dotenv.config();
const router = Router();

router.get('/debug/case2606009', async (req, res) => {
  try {
    const GeneralCase = (await import('../models/GeneralCase.js')).default;
    const User = (await import('../models/User.js')).default;
    const cases = await GeneralCase.find({ patientId: '2606009' }).lean();
    const doctors = await User.find({ role: 'doctor', department: /Prostho/i }).lean();
    res.json({ cases, doctors });
  } catch (err) {
    res.json({ error: err.message });
  }
});

const findUserByIdentifier = async (identifier) => {
  const normalizedIdentifier = String(identifier || '').trim();
  const escapedIdentifier = normalizedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return User.findOne({
    $or: [
      { email: { $regex: new RegExp("^" + escapedIdentifier + "$", "i") } },
      { Identity: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } },
    ],
  });
};

const normalizeRoleName = (role) => {
  if (!role) return '';
  return String(role).trim().toLowerCase().replace(/[_\s]+/g, '-');
};

const normalizeDepartmentName = (department) => {
  if (!department) return '';
  return String(department).trim().toLowerCase().replace(/[_\s]+/g, '');
};

const normalizePhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';

  // Convert common Indian country-code format (91XXXXXXXXXX) to 10-digit mobile.
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  return digits;
};

const buildLoosePhoneRegex = (phoneDigits) => {
  if (!phoneDigits) return null;

  const digitPattern = phoneDigits.split('').join('\\D*');
  // Accept optional +91/91 prefix and separators.
  return new RegExp(`^(?:\\+?91\\D*)?${digitPattern}\\D*$`);
};

const sanitizeDoctorProfileResponse = (user) => ({
  name: String(user?.name || '').trim(),
  email: String(user?.email || '').trim(),
  phone: String(user?.phone || '').trim(),
  department: String(user?.department || '').trim(),
  specialization: String(user?.specialization || '').trim(),
  role: normalizeRoleName(user?.role),
  Identity: String(user?.Identity || '').trim(),
});


// ➤ Route: POST /signup
router.post('/signup', async (req, res) => {
  const { name, phone, email, password, role, Identity } = req.body;

  try {
    const normalizedRole = normalizeRoleName(role);
    if (normalizedRole !== 'patient') {
      return res.status(403).json({
        message: 'Public signup is available for patients only.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User with this email already exists' });

    // Hash password
    const hashedPassword = await hash(password, 10);
    let finalIdentity = Identity; // doctor/admin keep manual ID

    if (normalizedRole === 'patient') {
      // Use shared generator so signup & admin registration share the same sequence
      finalIdentity = await generateNextPatientId();
    }


const newUser = new User({
  name,
  phone: normalizePhoneNumber(phone),
  email,
  password: hashedPassword,
  role: normalizedRole,
  Identity: finalIdentity,
});

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', Identity: newUser.Identity });
    
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

router.post('/login/patientlogin', async (req, res) => {
  const { identifier, password } = req.body;
  const normalizedIdentifier = String(identifier || '').trim();
  const normalizedPhone = normalizePhoneNumber(normalizedIdentifier);
  const loosePhoneRegex = buildLoosePhoneRegex(normalizedPhone);
  console.log("➡️ Login attempt with identifier:", normalizedIdentifier);

  try {
    const escapedIdentifier = normalizedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let user = await User.findOne({
      $or: [
        { Identity: { $regex: new RegExp("^" + escapedIdentifier + "$", "i") } },
        { phone: normalizedIdentifier }
      ]
    });

    if (!user && loosePhoneRegex) {
      user = await User.findOne({
        phone: { $regex: loosePhoneRegex }
      });
    }

    console.log("🔍 Found user:", user);

    if (!user) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // check password
    const storedPassword = typeof user.password === 'string' ? user.password : '';
    let isMatch = false;
    if (storedPassword) {
      isMatch = await compare(password, storedPassword);
    }

    // Migrate plain-text stored password to bcrypt hash
    if (!isMatch && storedPassword && storedPassword === password) {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    // Allow '123456' as default for accounts with no password set
    if (!isMatch && !storedPassword && password === '123456') {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: user.role,
      name: user.name,
      Identity: user.Identity
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/email-retrieve/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;

    // Find user by Identity (patientId from URL)
    const user = await User.findOne({ Identity: patientId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.status(200).json({
      success: true,
      email: user.email,
      phone: user.phone,
      name: user.name,
      Identity: user.Identity,
    });
  } catch (error) {
    console.error('Error fetching patient email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient information',
    });
  }
});

// Fetch basic signup details (name, email, phone) by patient ID
router.get('/patient-basic-details/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const user = await User.findOne({ Identity: patientId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    return res.status(200).json({
      success: true,
      name: user.name,
      email: user.email,
      phone: user.phone,
      Identity: user.Identity,
    });
  } catch (error) {
    console.error('Error fetching basic patient signup details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient signup details',
    });
  }
});

router.post('/login/doctorlogin', async (req, res) => {
  const { identifier, password } = req.body;

  if (!String(identifier || '').trim() || !String(password || '').trim()) {
    return res.status(400).json({ message: 'Identifier and password are required.' });
  }

  try {
    const user = await findUserByIdentifier(identifier);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

      // Verify role = doctor/chief/pg/ug (case-insensitive to support legacy records)
      const normalizedRole = String(user.role || '').trim().toLowerCase();
      const allowedDoctorPortalRoles = new Set(['doctor', 'chief', 'chief-doctor', 'pg', 'ug']);
      if (!allowedDoctorPortalRoles.has(normalizedRole)) {
        return res.status(403).json({ message: 'Access denied. Not a doctor/PG/UG account.' });
      }

    // Check password
    let isMatch = false;
    const storedPassword = typeof user.password === 'string' ? user.password : '';
    try {
      isMatch = await compare(password, storedPassword);
    } catch {
      isMatch = false;
    }

    // Legacy compatibility: support old plaintext records, then migrate them to bcrypt
    // on successful login.
    if (!isMatch && storedPassword && storedPassword === password) {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    // Very old records may have an empty password field; allow initial default password
    // only when no password is currently set.
    if (!isMatch && !storedPassword && password === '123456') {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password' });

    // Generate JWT
    const token = sign(
      { userId: user._id, role: normalizedRole },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: normalizedRole,
      name: user.name,
      Identity: user.Identity,
      email: user.email,
      department: user.department || ''
    });
  } catch (err) {
    console.error('Doctor Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/doctor/profile', auth, requireRole(['doctor', 'chief', 'chief-doctor', 'pg']), async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).lean();
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      profile: sanitizeDoctorProfileResponse(currentUser),
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

const updateDoctorProfile = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const department = String(req.body?.department || '').trim();
    const specialization = String(req.body?.specialization || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      const existingByEmail = await User.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: req.user._id },
      }).lean();

      if (existingByEmail) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          name,
          email,
          phone,
          department,
          specialization,
        },
      },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: sanitizeDoctorProfileResponse(updatedUser),
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

router.put('/doctor/profile', auth, requireRole(['doctor', 'chief', 'chief-doctor', 'pg']), updateDoctorProfile);
router.patch('/doctor/profile', auth, requireRole(['doctor', 'chief', 'chief-doctor', 'pg']), updateDoctorProfile);

router.get('/me/contact', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).lean();
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      contact: {
        email: String(currentUser.email || '').trim(),
        phone: String(currentUser.phone || '').trim(),
        name: String(currentUser.name || '').trim(),
        role: normalizeRoleName(currentUser.role),
        Identity: String(currentUser.Identity || '').trim(),
      },
    });
  } catch (error) {
    console.error('Error fetching current user contact:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user contact' });
  }
});

// routes/auth.js - Admin Login Route
router.post('/login/adminlogin', async (req, res) => {
  const { identifier, password } = req.body;

  if (!String(identifier || '').trim() || !String(password || '').trim()) {
    return res.status(400).json({ message: 'Identifier and password are required.' });
  }

  try {
    const user = await findUserByIdentifier(identifier);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    const normalizedRole = String(user.role || '').trim().toLowerCase();
    // Allowed admin-portal roles: admin, phc1, phc2, c (camp)
    const adminPortalRoles = new Set(['admin', 'phc1', 'phc2', 'c']);
    if (!adminPortalRoles.has(normalizedRole)) {
      return res.status(403).json({ message: 'Access denied. Not an administrator.' });
    }

    // Check password
    let isMatch = false;
    const storedPassword = typeof user.password === 'string' ? user.password : '';
    try {
      isMatch = await compare(password, storedPassword);
    } catch {
      isMatch = false;
    }

    // Legacy compatibility: support old plaintext admin records,
    // then migrate them to a bcrypt hash on successful login.
    if (!isMatch && storedPassword && storedPassword === password) {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    // Very old records may have an empty password field; allow initial default password
    // only when no password is currently set.
    if (!isMatch && !storedPassword && password === '123456') {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password' });

    // Generate JWT
    const token = sign(
      { userId: user._id, role: normalizedRole },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: normalizedRole,
      name: user.name,
      Identity: user.Identity,
      email: user.email
    });
  } catch (err) {
    console.error('Admin Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Password reset route
// Check if user exists
router.post('/check-user', async (req, res) => {
  const { email, phone } = req.body;
  
  try {
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }
    
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Check user error:', err);
    res.status(500).json({ message: 'Server error checking user' });
  }
});

// Password reset route
router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    console.log('🔄 Password reset request:', { email, phone, hasPassword: !!password });

    // Validate required fields
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone is required'
      });
    }

    // Find user by email or phone
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash the new password
    const hashedPassword = await hash(password, 10);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password reset successful for:', email || phone);

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (err) {
    console.error('❌ Reset Password Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// ➤ Route: POST /auth/create-doctor (Chief Doctor assigns a new doctor)
router.post('/create-doctor', auth, requireRole(['chief', 'chief-doctor']), async (req, res) => {
  const { staffId, doctorName, doctorEmail, doctorPhone, department, specialization } = req.body;

  try {
    const requesterDepartment = String(req.user?.department || '').trim();
    const normalizedRequesterDepartment = normalizeDepartmentName(requesterDepartment);
    const normalizedRequestedDepartment = normalizeDepartmentName(department);

    // Validate required fields
    if (!staffId || !doctorName || !doctorEmail || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staffId, doctorName, doctorEmail, department'
      });
    }

    // Check if staff ID already exists
    const existingStaff = await User.findOne({ staffId });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: doctorEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const normalizedRequesterRole = normalizeRoleName(req.user.role);
    if (normalizedRequesterRole !== 'chief-doctor' && normalizedRequesterRole !== 'chief') {
      return res.status(403).json({
        success: false,
        message: 'Invalid chief doctor. Only chief doctors can create new doctors.'
      });
    }

    if (!normalizedRequesterDepartment) {
      return res.status(403).json({
        success: false,
        message: 'Your chief doctor account does not have a department assigned.'
      });
    }

    if (normalizedRequestedDepartment !== normalizedRequesterDepartment) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign doctors in your own department.'
      });
    }

    // Generate a random password
    const generatedPassword = generateRandomPassword(staffId);
    const hashedPassword = await hash(generatedPassword, 10);

    // Create new doctor user
    const newDoctor = new User({
      name: doctorName,
      email: doctorEmail,
      phone: doctorPhone || '',
      password: hashedPassword,
      role: 'doctor',
      Identity: staffId, // Using staffId as Identity for doctors
      department: requesterDepartment,
      specialization: String(specialization || '').trim() || null,
      staffId: staffId,
      createdBy: req.user._id
    });

    await newDoctor.save();

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      doctor: {
        _id: newDoctor._id,
        name: newDoctor.name,
        email: newDoctor.email,
        phone: newDoctor.phone,
        staffId: newDoctor.staffId,
        department: newDoctor.department,
        specialization: newDoctor.specialization,
        role: newDoctor.role,
        generatedPassword: generatedPassword // Send password to chief doctor to share with new doctor
      }
    });

  } catch (err) {
    console.error('❌ Create Doctor Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating doctor account'
    });
  }
});

// ➤ Route: POST /auth/create-pg (Doctor assigns a new PG student)
router.post('/create-pg', auth, requireRole(['doctor']), async (req, res) => {
  const { staffId, pgName, pgEmail, pgPhone, department, specialization } = req.body;

  console.log('📝 Create PG Request:', { staffId, pgName, pgEmail, department, doctorId: req.user?._id });

  try {
    // Validate required fields
    if (!staffId || !pgName || !pgEmail || !department) {
      console.log('❌ Missing fields:', { staffId, pgName, pgEmail, department });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staffId, pgName, pgEmail, department'
      });
    }

    // Check if staff ID already exists
    const existingStaff = await User.findOne({ staffId });
    if (existingStaff) {
      console.log('❌ Staff ID already exists:', staffId);
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: pgEmail });
    if (existingEmail) {
      console.log('❌ Email already registered:', pgEmail);
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const supervisor = await User.findById(req.user._id);

    console.log('👨‍⚕️ Doctor found:', supervisor ? supervisor.name : 'NOT FOUND');

    if (!supervisor || normalizeRoleName(supervisor.role) !== 'doctor') {
      console.log('❌ Doctor not found for authenticated user:', req.user?._id);
      return res.status(403).json({
        success: false,
        message: 'Invalid doctor. Only doctors can create new PG students.'
      });
    }

    // Generate a random password
    const generatedPassword = generateRandomPassword(staffId);
    const hashedPassword = await hash(generatedPassword, 10);

    // Create new PG user
    const newPG = new User({
      name: pgName,
      email: pgEmail,
      phone: pgPhone || '',
      password: hashedPassword,
      role: 'pg',
      Identity: staffId, // Using staffId as Identity for PGs
      department: department,
      specialization: String(specialization || '').trim() || null,
      staffId: staffId,
      createdBy: supervisor._id,
      supervisingDoctor: supervisor._id
    });

    await newPG.save();

    console.log('✅ PG created successfully:', newPG.name);

    res.status(201).json({
      success: true,
      message: 'PG account created successfully',
      pg: {
        _id: newPG._id,
        name: newPG.name,
        email: newPG.email,
        phone: newPG.phone,
        staffId: newPG.staffId,
        department: newPG.department,
        specialization: newPG.specialization,
        role: newPG.role,
        generatedPassword: generatedPassword // Send password to doctor to share with PG
      }
    });

  } catch (err) {
    console.error('❌ Create PG Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating PG account: ' + err.message
    });
  }
});

// ➤ Route: POST /auth/create-ug (Doctor assigns a new UG student)
router.post('/create-ug', auth, requireRole(['doctor']), async (req, res) => {
  const { staffId, ugName, ugEmail, ugPhone, department, specialization } = req.body;

  console.log('📝 Create UG Request:', { staffId, ugName, ugEmail, department, doctorId: req.user?._id });

  try {
    if (!staffId || !ugName || !ugEmail || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staffId, ugName, ugEmail, department'
      });
    }

    const existingStaff = await User.findOne({ staffId });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists'
      });
    }

    const existingEmail = await User.findOne({ email: ugEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const supervisor = await User.findById(req.user._id);
    if (!supervisor || normalizeRoleName(supervisor.role) !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Invalid doctor. Only doctors can create new UG students.'
      });
    }

    const generatedPassword = generateRandomPassword(staffId);
    const hashedPassword = await hash(generatedPassword, 10);

    const newUG = new User({
      name: ugName,
      email: ugEmail,
      phone: ugPhone || '',
      password: hashedPassword,
      role: 'ug',
      Identity: staffId,
      department: department,
      specialization: String(specialization || '').trim() || null,
      staffId: staffId,
      createdBy: supervisor._id,
    });

    await newUG.save();

    return res.status(201).json({
      success: true,
      message: 'UG account created successfully',
      ug: {
        _id: newUG._id,
        name: newUG.name,
        email: newUG.email,
        phone: newUG.phone,
        staffId: newUG.staffId,
        department: newUG.department,
        specialization: newUG.specialization,
        role: newUG.role,
        generatedPassword,
      },
    });
  } catch (err) {
    console.error('❌ Create UG Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating UG account: ' + err.message,
    });
  }
});

// Get doctors assigned by the logged-in chief doctor
router.get('/chief/assigned-doctors', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const requesterDepartment = String(req.user?.department || '').trim();
    const doctors = await User.find(
      {
        role: 'doctor',
        createdBy: req.user._id,
        ...(requesterDepartment ? { department: requesterDepartment } : {}),
      },
      { _id: 1, name: 1, email: 1, phone: 1, Identity: 1, staffId: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, doctors });
  } catch (err) {
    console.error('Error fetching assigned doctors:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned doctors' });
  }
});

// List available chief doctors for reassignment
router.get('/chief/chief-doctors', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const requesterDepartment = String(req.user?.department || '').trim();
    const chiefDoctors = await User.find(
      {
        role: { $in: ['chief-doctor', 'chief'] },
        _id: { $ne: req.user._id },
        ...(requesterDepartment ? { department: requesterDepartment } : {}),
      },
      { _id: 1, name: 1, Identity: 1, email: 1, department: 1 }
    )
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, chiefDoctors });
  } catch (err) {
    console.error('Error fetching chief doctors:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chief doctors' });
  }
});

// Reassign a doctor from current chief to another chief doctor
router.patch('/chief/assigned-doctors/:doctorId/reassign', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { newChiefIdentity } = req.body;

    if (!newChiefIdentity) {
      return res.status(400).json({ success: false, message: 'newChiefIdentity is required' });
    }

    const targetChief = await User.findOne({
      Identity: newChiefIdentity,
      role: { $in: ['chief-doctor', 'chief'] },
    });

    if (!targetChief) {
      return res.status(404).json({ success: false, message: 'Target chief doctor not found' });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      createdBy: req.user._id,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found under your assignment list' });
    }

    if (normalizeDepartmentName(doctor.department) !== normalizeDepartmentName(req.user?.department)) {
      return res.status(403).json({ success: false, message: 'You can only reassign doctors from your own department.' });
    }

    if (normalizeDepartmentName(targetChief.department) !== normalizeDepartmentName(req.user?.department)) {
      return res.status(403).json({ success: false, message: 'Doctors can only be reassigned to a chief doctor in the same department.' });
    }

    doctor.createdBy = targetChief._id;
    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor reassigned successfully',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        Identity: doctor.Identity,
        department: doctor.department,
      },
      reassignedTo: {
        _id: targetChief._id,
        name: targetChief.name,
        Identity: targetChief.Identity,
      },
    });
  } catch (err) {
    console.error('Error reassigning doctor:', err);
    res.status(500).json({ success: false, message: 'Failed to reassign doctor' });
  }
});

// Remove current chief as owner of an assigned doctor
router.patch('/chief/assigned-doctors/:doctorId/unassign', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      createdBy: req.user._id,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found under your assignment list' });
    }

    if (normalizeDepartmentName(doctor.department) !== normalizeDepartmentName(req.user?.department)) {
      return res.status(403).json({ success: false, message: 'You can only unassign doctors from your own department.' });
    }

    doctor.createdBy = null;
    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor removed from your assigned list',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        Identity: doctor.Identity,
        department: doctor.department,
      },
    });
  } catch (err) {
    console.error('Error unassigning doctor:', err);
    res.status(500).json({ success: false, message: 'Failed to unassign doctor' });
  }
});

/* ================= DOCTOR - ASSIGNED UGs ROUTES ================= */

// Get all UGs assigned by this doctor
router.get('/doctor/assigned-ugs', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const ugs = await User.find(
      { role: 'ug', createdBy: req.user._id },
      { _id: 1, name: 1, email: 1, phone: 1, Identity: 1, staffId: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, ugs });
  } catch (err) {
    console.error('Error fetching assigned UGs:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch assigned UGs' });
  }
});

// Update a UG's basic details (doctor can update only their own created UGs)
router.patch('/doctor/assigned-ugs/:ugId/update', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { ugId } = req.params;
    const { name, email, phone, department } = req.body || {};

    const ug = await User.findOne({
      _id: ugId,
      role: 'ug',
      createdBy: req.user._id,
    });

    if (!ug) {
      return res.status(404).json({ success: false, message: 'UG not found under your assignment list' });
    }

    if (email !== undefined && String(email).trim()) {
      const existing = await User.findOne({
        email: String(email).trim(),
        _id: { $ne: ug._id },
      }).lean();

      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    if (name !== undefined) ug.name = String(name).trim();
    if (email !== undefined) ug.email = String(email).trim();
    if (phone !== undefined) ug.phone = String(phone).trim();
    if (department !== undefined) ug.department = String(department).trim();

    await ug.save();

    return res.json({
      success: true,
      message: 'UG updated successfully',
      ug: {
        _id: ug._id,
        name: ug.name,
        email: ug.email,
        phone: ug.phone,
        Identity: ug.Identity,
        department: ug.department,
      },
    });
  } catch (err) {
    console.error('Error updating UG:', err);
    return res.status(500).json({ success: false, message: 'Failed to update UG' });
  }
});

// Remove a UG from doctor's assigned list
router.patch('/doctor/assigned-ugs/:ugId/unassign', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { ugId } = req.params;

    const ug = await User.findOne({
      _id: ugId,
      role: 'ug',
      createdBy: req.user._id,
    });

    if (!ug) {
      return res.status(404).json({ success: false, message: 'UG not found under your assignment list' });
    }

    ug.createdBy = null;
    await ug.save();

    return res.json({
      success: true,
      message: 'UG removed from your assigned list',
      ug: {
        _id: ug._id,
        name: ug.name,
        Identity: ug.Identity,
        department: ug.department,
      },
    });
  } catch (err) {
    console.error('Error unassigning UG:', err);
    return res.status(500).json({ success: false, message: 'Failed to unassign UG' });
  }
});

/* ================= DOCTOR - ASSIGNED PGs ROUTES ================= */

// Get all PGs assigned by this doctor
router.get('/doctor/assigned-pgs', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const pgs = await User.find(
      { role: 'pg', createdBy: req.user._id },
      { _id: 1, name: 1, email: 1, phone: 1, Identity: 1, staffId: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, pgs });
  } catch (err) {
    console.error('Error fetching assigned PGs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned PGs' });
  }
});

// Get overview of assigned PGs with analytics
router.get('/doctor/assigned-pgs/overview', auth, requireRole(['doctor']), async (req, res) => {
  // Use safe logging: try to append to a debug file, but fall back to console.log
  try {
    const fs = await import('fs');
    fs.appendFileSync('debug-pg-appointments.log', `\n\n========================================\n[${new Date().toISOString()}] Endpoint called\n`);
  } catch (logErr) {
    console.log('[PG Overview DEBUG] Endpoint called', new Date().toISOString(), logErr?.message || '');
  }
  
  try {
    const { PatientDetails } = await import('../models/patientDetails.js');
    const generalCaseModule = await import('../models/GeneralCase.js');
    const prescriptionModule = await import('../models/Prescription.js');
    const pedodonticsModule = await import('../models/PedodonticsCase.js');
    const completeDentureModule = await import('../models/CompleteDentureCase.js');
    const fpdModule = await import('../models/Fpd-model.js');
    const implantModule = await import('../models/Implant-model.js');
    const implantPatientModule = await import('../models/ImplantPatient-model.js');
    const partialModule = await import('../models/partial-model.js');

    const GeneralCase = generalCaseModule.default;
    const Prescription = prescriptionModule.default;
    const PedodonticsCase = pedodonticsModule.default;
    const CompleteDentureCase = completeDentureModule.default;
    const FPD = fpdModule.default;
    const Implant = implantModule.default;
    const ImplantPatient = implantPatientModule.default;
    const PartialDenture = partialModule.default;

    const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');
    const GENERAL_DOCTOR_DEPARTMENT_KEYS = new Set(['general', 'generaldentistry', 'oral', 'oralmedicine', 'oralmedicineandradiology', 'oralmedicineradiology']);
    const isGeneralDept = GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(req.user?.department || ''));
    const getDepartmentBucket = (departmentLabel) => {
      const normalized = normalizeDepartment(departmentLabel);

      if (!normalized) return 'all';
      if (normalized.includes('pedodont')) return 'pedodontics';
      if (
        normalized.includes('prostho') ||
        normalized.includes('protho') ||
        normalized.includes('prosth') ||
        normalized === 'fpd' ||
        normalized === 'fixedpartialdenture' ||
        normalized.includes('implant') ||
        normalized.includes('partial')
      ) {
        return 'prosthodontics';
      }

      return 'all';
    };

    const extractResendReason = (chiefApprovalText) => {
      const rawText = String(chiefApprovalText || '').trim();
      if (!rawText) return '';

      const match = rawText.match(/(?:redo|resend)\s*:?\s*(.*)$/i);
      if (!match) return '';

      return String(match[1] || '').trim();
    };

    // Get all PGs that have referrals supervised by this doctor (either created by them OR in their department)
    const doctorDepartment = String(req.user?.department || '').trim();
    const doctorIdentity = String(req.user?.Identity || '').trim();
    const rawDoctorIdentity = String(req.user?.Identity || '');
    
    // First, find all referrals where this doctor is the specialist doctor
    // Match by either the doctor's Identity string or their _id (ObjectId/string)
    const doctorReferrals = await GeneralCase.find({
      $or: [
        { specialistDoctorId: doctorIdentity },
        { specialistDoctorId: rawDoctorIdentity },
        { specialistDoctorId: req.user._id },
        { specialistDoctorId: String(req.user._id) },
      ],
      specialistStatus: { $in: ['approved', 'pending', 'rescheduled'] }
    }, { assignedPgId: 1 }).lean();
    
    const pgIdentitiesFromReferrals = [...new Set(
      doctorReferrals.map(r => String(r.assignedPgId || '').trim()).filter(Boolean)
    )];
    const pgRawIdentitiesFromReferrals = [...new Set(
      doctorReferrals.map(r => String(r.assignedPgId || '')).filter(Boolean)
    )];
    
    // Get PGs either created by this doctor OR assigned cases under this doctor
    const assignedPGs = await User.find(
      { 
        role: 'pg',
        $or: [
          { createdBy: req.user._id },
          { Identity: { $in: pgIdentitiesFromReferrals } },
          { Identity: { $in: pgRawIdentitiesFromReferrals } }
        ]
      },
      { _id: 1, name: 1, Identity: 1, email: 1, phone: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    if (!assignedPGs.length) {
      return res.json({
        success: true,
        pgs: [],
        appointments: [],
        analytics: [],
      });
    }

    // Query appointments by BOTH PG _id and Identity formats
    const pgIdentityKeys = Array.from(
      new Set(
        assignedPGs
          .map((pg) => (pg.Identity ? String(pg.Identity).trim() : null))
          .filter(Boolean)
      )
    );

    const pgIdKeys = Array.from(
      new Set(
        assignedPGs
          .map((pg) => (pg._id ? String(pg._id) : null))
          .filter(Boolean)
      )
    );

    // Also include the actual ObjectId values if present on the assignedPGs array
    const pgObjectIds = assignedPGs.map((pg) => pg._id).filter(Boolean);

    const pgQueryKeys = [...new Set([...pgIdentityKeys, ...pgIdKeys])];

    // ═══════════════════════════════════════════════════════════════
    // FAST PATH: General departments (oral medicine) — fetch ALL
    // appointments and cases directly, no referral flow needed
    // ═══════════════════════════════════════════════════════════════
    if (isGeneralDept) {
      const Appointment = (await import('../models/AppoitmentBooked.js')).Appointment;

      // General departments see ALL appointments — central hub view
      // Run all 3 queries in parallel for speed
      const [allAppointments, generalCases] = await Promise.all([
        Appointment.find({
          status: { $nin: ['cancelled', 'completed', 'closed'] },
        }).sort({ createdAt: -1 }).lean(),
        GeneralCase.find({}, { patientId: 1, assignedPgId: 1, chiefComplaint: 1, chiefApproval: 1, createdAt: 1, patientName: 1, _id: 1 }).sort({ createdAt: -1 }).lean(),
      ]);

      const caseIds = generalCases.map(c => String(c._id));
      const prescriptionsByCase = caseIds.length
        ? await Prescription.find({ caseId: { $in: caseIds } }, { caseId: 1 }).lean()
        : [];
      const prescriptionCaseIdSet = new Set(prescriptionsByCase.map(p => String(p.caseId)));

      // Build patient lookup
      const uniquePatientIds = new Set(allAppointments.map(a => String(a.patientId)).filter(Boolean));
      generalCases.forEach(c => { if (c.patientId) uniquePatientIds.add(String(c.patientId)); });

      const patientDetails = uniquePatientIds.size
        ? await PatientDetails.find({ patientId: { $in: Array.from(uniquePatientIds) } }, { patientId: 1, 'personalInfo.firstName': 1, 'personalInfo.lastName': 1, 'personalInfo.gender': 1, createdAt: 1 }).lean()
        : [];
      const patientMap = new Map(patientDetails.map(p => [String(p.patientId), p]));
      const patientNameMap = new Map(patientDetails.map(p => {
        const fn = String(p?.personalInfo?.firstName || '').trim();
        const ln = String(p?.personalInfo?.lastName || '').trim();
        return [String(p.patientId), `${fn} ${ln}`.trim() || null];
      }));

      const pgLookup = new Map(assignedPGs.map(pg => [String(pg._id), pg]));
      const pgIdentityToCanonical = new Map(assignedPGs.map(pg => [String(pg.Identity || '').trim(), String(pg._id)]));

      // Build a patientId -> PG identity mapping from GeneralCase assignments
      const patientToPgMap = new Map();
      generalCases.forEach(gc => {
        const pid = String(gc.patientId || '').trim();
        const pgId = String(gc.assignedPgId || '').trim();
        if (pid && pgId && !patientToPgMap.has(pid)) {
          patientToPgMap.set(pid, pgId);
        }
      });

      // Collect all unique identity keys from appointments to look up names
      const allIdentityKeys = new Set();
      allAppointments.forEach((appt) => {
        const pgId = appt.assignedPgUgId || appt.assigned_pg_ug_id || appt.pgDoctorId || appt.doctorId || '';
        if (pgId) allIdentityKeys.add(String(pgId).trim());
      });
      // Also add all PG identities
      assignedPGs.forEach(pg => {
        if (pg.Identity) allIdentityKeys.add(String(pg.Identity).trim());
      });

      // Look up names for all identities from User collection
      const identityNameMap = new Map();
      if (allIdentityKeys.size) {
        const allUsers = await User.find(
          { Identity: { $in: Array.from(allIdentityKeys) } },
          { Identity: 1, name: 1, role: 1 }
        ).lean();
        allUsers.forEach(u => {
          if (u.Identity) identityNameMap.set(String(u.Identity).trim(), u.name || null);
        });
      }

      // Build scheduled appointments from actual Appointment records
      const scheduledByPG = new Map();
      allAppointments.forEach((appt) => {
        const pgId = appt.assignedPgUgId || appt.assigned_pg_ug_id || appt.pgDoctorId || appt.doctorId || '';
        let canonical = pgIdentityToCanonical.get(String(pgId).trim()) || pgId || null;

        // If no PG on the appointment, try to find from GeneralCase patient mapping
        if (!canonical) {
          const patientId = String(appt.patientId || '').trim();
          const assignedPgId = patientToPgMap.get(patientId);
          if (assignedPgId) {
            canonical = pgIdentityToCanonical.get(assignedPgId) || assignedPgId;
          }
        }

        if (!canonical) canonical = '_unassigned';

        // Resolve PG name: from pgLookup first, then from identityNameMap
        let resolvedPgName = null;
        if (pgLookup.has(canonical)) {
          resolvedPgName = pgLookup.get(canonical)?.name || null;
        } else {
          resolvedPgName = identityNameMap.get(String(canonical).trim()) || identityNameMap.get(String(pgId).trim()) || null;
        }

        if (!scheduledByPG.has(canonical)) scheduledByPG.set(canonical, []);
        scheduledByPG.get(canonical).push({
          referralId: appt._id,
          bookingId: appt.bookingId || '',
          patientId: appt.patientId,
          patientName: patientNameMap.get(String(appt.patientId)) || appt.patientName || null,
          appointmentDate: appt.appointmentDate || '',
          appointmentTime: appt.appointmentTime || '',
          chiefComplaint: appt.chiefComplaint,
          status: appt.status || 'pending',
          hasCaseSheet: false,
          hasPrescription: false,
          caseId: '',
          caseDepartment: 'General',
          assignedAt: appt.createdAt,
          resolvedPgName,
        });
      });

      // Build a map of patientId -> latest appointment for enriching GeneralCase referrals
      const appointmentByPatient = new Map();
      allAppointments.forEach((appt) => {
        const pid = String(appt.patientId || '').trim();
        if (pid && !appointmentByPatient.has(pid)) {
          appointmentByPatient.set(pid, appt);
        }
      });

      // Add GeneralCase referrals
      generalCases.forEach((gc) => {
        const pgIdentity = String(gc.assignedPgId || '').trim();
        const canonical = pgIdentityToCanonical.get(pgIdentity) || pgIdentity;
        if (!pgLookup.has(canonical)) return;

        if (!scheduledByPG.has(canonical)) scheduledByPG.set(canonical, []);
        const patientId = String(gc.patientId || '').trim();
        const hasCaseSheet = true;
        const hasPrescription = prescriptionCaseIdSet.has(String(gc._id));

        // Find matching appointment for this patient to get bookingId/date/time
        const matchedAppt = appointmentByPatient.get(patientId) || null;

        scheduledByPG.get(canonical).push({
          referralId: gc._id,
          bookingId: matchedAppt?.bookingId || '',
          patientId,
          patientName: patientNameMap.get(patientId) || gc.patientName || null,
          appointmentDate: matchedAppt?.appointmentDate || '',
          appointmentTime: matchedAppt?.appointmentTime || '',
          chiefComplaint: gc.chiefComplaint,
          status: hasPrescription ? 'completed' : (gc.chiefApproval === 'Resend: ' ? 'pending' : 'pending'),
          statusTag: gc.chiefApproval?.startsWith('Resend') ? 'resent' : '',
          hasCaseSheet,
          hasPrescription,
          caseId: String(gc._id),
          caseDepartment: 'General',
          chiefApproval: gc.chiefApproval || '',
          assignedAt: gc.pgAssignedAt || gc.createdAt,
        });
      });

      // Build analytics
      const uniquePatientVisitCounts = new Map();
      scheduledByPG.forEach((appts, pgKey) => {
        appts.forEach(a => {
          if (a.patientId) {
            if (!uniquePatientVisitCounts.has(pgKey)) uniquePatientVisitCounts.set(pgKey, new Map());
            const m = uniquePatientVisitCounts.get(pgKey);
            m.set(a.patientId, (m.get(a.patientId) || 0) + 1);
          }
        });
      });

      const analytics = assignedPGs.map((pg) => {
        const doctorKey = String(pg._id);
        const visitMap = uniquePatientVisitCounts.get(doctorKey) || new Map();
        const patientIds = Array.from(visitMap.keys());

        let malePatients = 0, femalePatients = 0, newPatients = 0, oldPatients = 0;
        patientIds.forEach(pid => {
          const p = patientMap.get(pid);
          const gender = String(p?.personalInfo?.gender || '').toLowerCase();
          if (gender === 'male') malePatients++;
          if (gender === 'female') femalePatients++;
          const createdAt = p?.createdAt ? new Date(p.createdAt) : null;
          if (createdAt && visitMap.get(pid) === 1) newPatients++;
          else oldPatients++;
        });

        const pgAppts = scheduledByPG.get(doctorKey) || [];
        const approvalCounts = { approved: 0, rejected: 0, pending: 0 };
        pgAppts.forEach(a => {
          const ca = String(a.chiefApproval || '').toLowerCase();
          if (ca.includes('approved')) approvalCounts.approved++;
          else if (ca.includes('resend') || ca.includes('redo')) approvalCounts.rejected++;
          else approvalCounts.pending++;
        });

        return {
          pgIdentity: pg.Identity,
          pgName: pg.name,
          uniquePatients: patientIds.length,
          malePatients, femalePatients, newPatients, oldPatients,
          totalCaseSheets: pgAppts.filter(a => a.hasCaseSheet).length,
          approvalCounts,
        };
      });

      const scheduledAppointmentsFlat = [];
      scheduledByPG.forEach((list, pgKey) => {
        const pg = pgLookup.get(pgKey);
        list.forEach(appt => {
          scheduledAppointmentsFlat.push({
            ...appt,
            pgIdentity: pg?.Identity || pgKey,
            pgName: pg?.name || appt.resolvedPgName || (pgKey === '_unassigned' ? 'Unassigned' : pgKey),
          });
        });
      });

      return res.json({
        success: true,
        pgs: assignedPGs.map(pg => ({ ...pg })),
        appointments: scheduledAppointmentsFlat,
        analytics,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // SPECIALIST DEPARTMENT PATH — referral-based flow
    // ═══════════════════════════════════════════════════════════════
    const referrals = await GeneralCase.find({ 
      $or: [
        { assignedPgId: { $in: pgIdentityKeys } },
        { assignedPgId: { $in: pgIdKeys } },
        { assignedPgId: { $in: pgObjectIds } },
        { specialistDoctorId: doctorIdentity },
        { specialistDoctorId: rawDoctorIdentity },
        { specialistDoctorId: req.user._id },
        { specialistDoctorId: String(req.user._id) },
      ], // Show all cases assigned to PGs under this doctor or assigned to this doctor
      specialistStatus: { $in: ['approved', 'pending', 'rescheduled'] }
    })
      .sort({ pgAssignedAt: -1, createdAt: -1 })
      .lean();

    console.log(`[PG Overview] Found ${referrals.length} referrals with specialistStatus in approved/pending/rescheduled`);
    if (referrals.length > 0) {
      console.log('[PG Overview] Sample referrals:');
      referrals.slice(0, 3).forEach((ref, idx) => {
        console.log(`  ${idx + 1}. Patient: ${ref.patientId}, AssignedPG: ${ref.assignedPgId}, Department: ${ref.referredDepartment}`);
      });
    }

    const referralPatientIds = Array.from(
      new Set(
        referrals
          .map((referral) => String(referral.patientId || '').trim())
          .filter(Boolean)
      )
    );

    console.log(`[PG Overview] Referral patients count: ${referralPatientIds.length}`);

    const caseSources = [
      { model: PedodonticsCase, department: 'Pedodontics', bucket: 'pedodontics' },
      { model: CompleteDentureCase, department: 'Complete Denture', bucket: 'prosthodontics' },
      { model: FPD, department: 'FPD', bucket: 'prosthodontics' },
      { model: Implant, department: 'Implant', bucket: 'prosthodontics' },
      { model: ImplantPatient, department: 'Implant Patient Surgery', bucket: 'prosthodontics' },
      { model: PartialDenture, department: 'Partial Denture', bucket: 'prosthodontics' },
    ];

    const allCases = referralPatientIds.length
      ? (
          await Promise.all(
            caseSources.map(async ({ model, department, bucket }) => {
              try {
                const cases = await model.find(
                  {
                    doctorId: { $in: pgQueryKeys },
                    patientId: { $in: referralPatientIds },
                  },
                  {
                    _id: 1,
                    patientId: 1,
                    doctorId: 1,
                    chiefApproval: 1,
                    createdAt: 1,
                  }
                ).lean();

                return cases.map((caseItem) => ({
                  caseId: String(caseItem._id),
                  patientId: String(caseItem.patientId || '').trim(),
                  doctorId: String(caseItem.doctorId || '').trim(),
                  chiefApproval: String(caseItem.chiefApproval || ''),
                  createdAt: caseItem.createdAt,
                  caseDepartment: department,
                  caseBucket: bucket,
                }));
              } catch (error) {
                console.error(`Error fetching ${department} cases for PG overview:`, error.message || error);
                return [];
              }
            })
          )
        ).flat()
      : [];

    const casesByPgPatient = new Map();
    allCases.forEach((caseItem) => {
      const key = `${caseItem.doctorId}::${caseItem.patientId}`;
      if (!casesByPgPatient.has(key)) {
        casesByPgPatient.set(key, []);
      }
      casesByPgPatient.get(key).push(caseItem);
    });

    casesByPgPatient.forEach((caseList) => {
      caseList.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    });

    const caseIds = allCases.map((caseItem) => caseItem.caseId).filter(Boolean);
    const prescriptionsByCase = caseIds.length
      ? await Prescription.find(
          { caseId: { $in: caseIds } },
          { caseId: 1 }
        ).lean()
      : [];

    const prescriptionsByPatientDoctor = referralPatientIds.length
      ? await Prescription.find(
          {
            patientId: { $in: referralPatientIds },
            doctorId: { $in: pgQueryKeys },
          },
          { patientId: 1, doctorId: 1 }
        ).lean()
      : [];

    const prescriptionCaseIdSet = new Set(
      prescriptionsByCase
        .map((prescription) => String(prescription.caseId || '').trim())
        .filter(Boolean)
    );

    const prescriptionPatientDoctorSet = new Set(
      prescriptionsByPatientDoctor
        .map((prescription) => `${String(prescription.doctorId || '').trim()}::${String(prescription.patientId || '').trim()}`)
        .filter((key) => key !== '::')
    );

    const pgLookup = new Map(assignedPGs.map((pg) => [String(pg._id), pg]));
    const pgIdentityToCanonical = new Map(
      assignedPGs.map((pg) => [String(pg.Identity || '').trim(), String(pg._id)])
    );
    const scheduledByPG = new Map();
    const patientVisitCountsByPG = new Map();
    const uniquePatientIds = new Set();

    referrals.forEach((referral) => {
      const pgKey = pgIdentityToCanonical.get(String(referral.assignedPgId || '').trim());
      if (!pgKey || !pgLookup.has(pgKey)) return;

      if (!scheduledByPG.has(pgKey)) {
        scheduledByPG.set(pgKey, []);
      }

      const referralPatientId = String(referral.patientId || '').trim();
      const assignedPgIdentity = String(referral.assignedPgId || '').trim();
      const caseLookupKey = `${assignedPgIdentity}::${referralPatientId}`;
      const candidateCases = casesByPgPatient.get(caseLookupKey) || [];

      const preferredBucket = getDepartmentBucket(
        referral.referredDepartment || referral.selectedDepartments?.[0] || ''
      );

      const bucketCases = preferredBucket === 'all'
        ? candidateCases
        : candidateCases.filter((caseItem) => caseItem.caseBucket === preferredBucket);

      const latestCase = bucketCases[0] || candidateCases[0] || null;
      const resendReason = extractResendReason(latestCase?.chiefApproval || '');

      const hasCaseSheet = Boolean(latestCase);
      const hasPrescription = latestCase
        ? prescriptionCaseIdSet.has(String(latestCase.caseId || '')) || prescriptionPatientDoctorSet.has(caseLookupKey)
        : false;

      let completionStatus = 'pending';
      let statusTag = '';

      if (resendReason) {
        completionStatus = 'pending';
        statusTag = 'resent';
      } else if (hasCaseSheet && hasPrescription) {
        completionStatus = 'completed';
      }

      scheduledByPG.get(pgKey).push({
        referralId: referral._id,
        patientId: referral.patientId,
        patientName: referral.patientName,
        referredDepartment: referral.referredDepartment || referral.selectedDepartments?.[0] || '',
        chiefComplaint: referral.chiefComplaint,
        status: completionStatus,
        statusTag,
        resendReason,
        hasCaseSheet,
        hasPrescription,
        caseId: latestCase?.caseId || '',
        caseDepartment: latestCase?.caseDepartment || '',
        chiefApproval: latestCase?.chiefApproval || '',
        assignedAt: referral.pgAssignedAt || referral.specialistReviewedAt || referral.createdAt,
      });

      if (referral.patientId) {
        const patientId = String(referral.patientId);
        uniquePatientIds.add(patientId);

        if (!patientVisitCountsByPG.has(pgKey)) {
          patientVisitCountsByPG.set(pgKey, new Map());
        }

        const pgPatientCountMap = patientVisitCountsByPG.get(pgKey);
        pgPatientCountMap.set(patientId, (pgPatientCountMap.get(patientId) || 0) + 1);
      }
    });

    // 🔥 Fetch actual appointment bookings for these patients
    // Query by patient IDs from referrals - simplest and most reliable
    const appointmentModule = await import('../models/AppoitmentBooked.js');
    const Appointment = appointmentModule.Appointment;

    const appointmentScopeQuery = {
      $or: [
        ...(referralPatientIds.length ? [{ patientId: { $in: referralPatientIds } }] : []),
        { assignedPgUgId: { $in: pgQueryKeys } },
        { assigned_pg_ug_id: { $in: pgQueryKeys } },
        { pgDoctorId: { $in: pgQueryKeys } },
        { doctorId: { $in: pgQueryKeys } },
      ],
    };

    const actualAppointments = await Appointment.find(appointmentScopeQuery)
      .sort({ createdAt: -1 })
      .lean();

    try {
      const fs = await import('fs');
      fs.appendFileSync('debug-pg-appointments.log', `Found ${actualAppointments.length} appointments for ${referralPatientIds.length} patients\n`);
    } catch (logErr) {
      console.log('[PG Overview DEBUG] Found', actualAppointments.length, 'appointments for', referralPatientIds.length, 'patients');
    }
    
    // Add appointment patients into the set so they are included in the PatientDetails lookup
    actualAppointments.forEach((appt) => {
      if (appt.patientId) uniquePatientIds.add(String(appt.patientId));
    });

    // Build TWO lookups:
    // 1. By patientId only (most reliable for matching)
    // 2. By patientId::pgIdentity (for appointments that have PG assignment)
    const appointmentLookup = new Map();
    const appointmentsByPatient = new Map();
    
    actualAppointments.forEach((appt) => {
      const patientId = String(appt.patientId || '').trim();
      if (!patientId) return;
      
      // Always add to patient-only lookup (use most recent appointment per patient)
      if (!appointmentsByPatient.has(patientId)) {
        appointmentsByPatient.set(patientId, appt);
      }
      
      // Also add to PG-specific lookup if PG is assigned
      const pgId =
        String(appt.assignedPgUgId || '').trim() ||
        String(appt.assigned_pg_ug_id || '').trim() ||
        String(appt.pgDoctorId || '').trim() ||
        String(appt.doctorId || '').trim() ||
        '';
      
      if (pgId) {
        const key = `${patientId}::${pgId}`;
        if (!appointmentLookup.has(key)) {
          appointmentLookup.set(key, appt);
        }
      }
    });

    try {
      const fs = await import('fs');
      fs.appendFileSync('debug-pg-appointments.log', `Lookup map size: ${appointmentLookup.size}, Fallback size: ${appointmentsByPatient.size}\n`);
      if (appointmentLookup.size > 0) {
        const keys = Array.from(appointmentLookup.keys()).slice(0, 3);
        fs.appendFileSync('debug-pg-appointments.log', `Sample lookup keys: ${keys.join(', ')}\n`);
      }
      if (appointmentsByPatient.size > 0) {
        const keys = Array.from(appointmentsByPatient.keys()).slice(0, 3);
        fs.appendFileSync('debug-pg-appointments.log', `Fallback patient IDs: ${keys.join(', ')}\n`);
      }
      fs.appendFileSync('debug-pg-appointments.log', `Found ${referrals.length} referrals\n`);
      if (referrals.length > 0) {
        referrals.slice(0, 2).forEach((ref, idx) => {
          fs.appendFileSync('debug-pg-appointments.log', `  Referral ${idx + 1}: Patient ${ref.patientId}, PG ${ref.assignedPgId}\n`);
        });
      }
    } catch (logErr) {
      console.log('[PG Overview DEBUG] Lookup map size:', appointmentLookup.size, 'Fallback size:', appointmentsByPatient.size);
      if (appointmentLookup.size > 0) console.log('[PG Overview DEBUG] Sample lookup keys:', Array.from(appointmentLookup.keys()).slice(0,3));
      if (appointmentsByPatient.size > 0) console.log('[PG Overview DEBUG] Fallback patient IDs:', Array.from(appointmentsByPatient.keys()).slice(0,3));
      console.log('[PG Overview DEBUG] Found referrals:', referrals.length);
    }
    
    console.log(`[PG Overview] Built appointment lookup with ${appointmentLookup.size} entries`);
    console.log(`[PG Overview] Built fallback patient lookup with ${appointmentsByPatient.size} entries`);
    if (appointmentLookup.size > 0) {
      const sampleKeys = Array.from(appointmentLookup.keys()).slice(0, 5);
      console.log('[PG Overview] Sample lookup keys (format: patientId::pgIdentity):', sampleKeys);
    }
    if (appointmentsByPatient.size > 0) {
      const samplePatients = Array.from(appointmentsByPatient.keys()).slice(0, 5);
      console.log('[PG Overview] Sample fallback patient IDs:', samplePatients);
    }
    
    console.log(`[PG Overview] Found ${referrals.length} referrals with specialistStatus in approved/pending/rescheduled`);

    const patientDetails = uniquePatientIds.size
      ? await PatientDetails.find(
          { patientId: { $in: Array.from(uniquePatientIds) } },
          {
            patientId: 1,
            'personalInfo.firstName': 1,
            'personalInfo.middleName': 1,
            'personalInfo.lastName': 1,
            'personalInfo.gender': 1,
            'medicalInfo.chiefComplaint': 1,
          }
        ).lean()
      : [];

    const patientMap = new Map(
      patientDetails.map((p) => [
        String(p.patientId),
        {
          gender: p.personalInfo?.gender || null,
          chiefComplaint: String(p.medicalInfo?.chiefComplaint || '').trim(),
          name: [
            p.personalInfo?.firstName,
            p.personalInfo?.middleName,
            p.personalInfo?.lastName,
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
        },
      ])
    );

    const analytics = assignedPGs.map((pg) => {
      const pgKey = String(pg._id);
      const pgPatientCountMap = patientVisitCountsByPG.get(pgKey) || new Map();

      let malePatients = 0;
      let femalePatients = 0;
      let oldPatients = 0;
      let newPatients = 0;

      pgPatientCountMap.forEach((visitCount, patientId) => {
        const patient = patientMap.get(patientId);
        if (patient) {
          const gender = patient.gender?.toLowerCase();
          if (gender === 'male') malePatients++;
          else if (gender === 'female') femalePatients++;
        }

        if (visitCount === 1) newPatients++;
        else if (visitCount > 1) oldPatients++;
      });

      const scheduledAppointments = scheduledByPG.get(pgKey) || [];

      return {
        pgName: pg.name,
        pgIdentity: pg.Identity,
        pgEmail: pg.email,
        department: pg.department,
        totalVisitedPatients: pgPatientCountMap.size,
        malePatients,
        femalePatients,
        newPatients,
        oldPatients,
        scheduledAppointments: scheduledAppointments.length,
      };
    });

    const enrichedAppointments = [];
    // Track which patientId::pgIdentity keys have been added (to avoid duplicates from appointment-only pass)
    const addedKeys = new Set();

    assignedPGs.forEach((pg) => {
      const pgKey = String(pg._id);
      const referralEntries = scheduledByPG.get(pgKey) || [];

      referralEntries.forEach((appt) => {
        const patientInfo = patientMap.get(String(appt.patientId || ''));
        const resolvedName = patientInfo?.name || String(appt.patientName || '').trim() || '-';

        // Look up appointment by patient ID (most reliable since PG fields may not be set correctly)
        let booking = appointmentsByPatient.get(String(appt.patientId).trim());
        
        if (!booking) {
          // Fallback: try PG-specific lookup
          const lookupKey = `${String(appt.patientId || '').trim()}::${String(pg.Identity || '').trim()}`;
          booking = appointmentLookup.get(lookupKey);
        }

        if (!booking && appt.patientId) {
          console.log(`[PG Overview] ❌ No booking found - Patient: ${appt.patientId}, PG: ${pg.Identity}`);
        } else if (booking) {
          console.log(`[PG Overview] ✅ Booking found - Patient: ${appt.patientId}, Booking: ${booking.bookingId}, Date: ${booking.appointmentDate}`);
        }

        addedKeys.add(String(appt.patientId).trim());

        enrichedAppointments.push({
          ...appt,
          chiefComplaint: String(appt.chiefComplaint || patientInfo?.chiefComplaint || '').trim(),
          patientName: resolvedName,
          pgName: pg.name,
          pgIdentity: pg.Identity,
          pgDepartment: pg.department,
          // Appointment booking fields — populated from actual Appointment doc if found
          bookingId: booking?.bookingId || '',
          appointmentDate: booking?.appointmentDate || '',
          appointmentTime: booking?.appointmentTime || '',
          appointmentStatus: booking?.status || '',
        });
      });
    });

    // Catch-all: If a referral was escalated to THIS doctor, but the assigned PG couldn't be matched
    // (e.g. PG created by someone else, or identity mismatch), STILL show it in the dashboard!
    referrals.forEach((referral) => {
      const patientId = String(referral.patientId || '').trim();
      const pgIdentity = String(referral.assignedPgId || '').trim();
      const lookupKey = `${patientId}::${pgIdentity}`;
      
      if (!patientId || addedKeys.has(lookupKey)) return;

      const patientInfo = patientMap.get(patientId);
      const resolvedName = patientInfo?.name || String(referral.patientName || '').trim() || '-';

      let booking = appointmentsByPatient.get(patientId);

      enrichedAppointments.push({
        referralId: referral._id,
        patientId,
        patientName: resolvedName,
        referredDepartment: referral.referredDepartment || referral.selectedDepartments?.[0] || '',
        chiefComplaint: String(referral.chiefComplaint || patientInfo?.chiefComplaint || '').trim(),
        status: referral.specialistStatus || 'pending',
        statusTag: '',
        resendReason: '',
        hasCaseSheet: false,
        hasPrescription: false,
        caseId: '',
        caseDepartment: '',
        chiefApproval: '',
        assignedAt: referral.pgAssignedAt || referral.specialistReviewedAt || referral.createdAt,
        pgName: pgIdentity ? `PG: ${pgIdentity}` : 'Unassigned',
        pgIdentity: pgIdentity || '',
        pgDepartment: referral.referredDepartment || '',
        bookingId: booking?.bookingId || '',
        appointmentDate: booking?.appointmentDate || '',
        appointmentTime: booking?.appointmentTime || '',
        appointmentStatus: booking?.status || '',
      });
      
      addedKeys.add(lookupKey);
    });

    // Sort the final enriched array by assignedAt / appointmentDate
    enrichedAppointments.sort((a, b) => {
      const dateA = a.appointmentDate ? new Date(a.appointmentDate) : new Date(a.assignedAt || 0);
      const dateB = b.appointmentDate ? new Date(b.appointmentDate) : new Date(b.assignedAt || 0);
      return dateB - dateA;
    });

    // Second pass: add appointment-only rows (patients with a booking but no referral entry)
    actualAppointments.forEach((appt) => {
      const pgId =
        String(appt.assignedPgUgId || '').trim() ||
        String(appt.assigned_pg_ug_id || '').trim() ||
        String(appt.pgDoctorId || '').trim() ||
        String(appt.doctorId || '').trim() ||
        '';
      if (!pgId) return;

      const lookupKey = `${String(appt.patientId || '').trim()}::${pgId}`;
      if (addedKeys.has(lookupKey)) return; // Already covered by a referral entry

      const pg = assignedPGs.find((p) => String(p.Identity).trim() === pgId);
      if (!pg) return;

      const patientInfo = patientMap.get(String(appt.patientId || ''));
      addedKeys.add(lookupKey);

      enrichedAppointments.push({
        referralId: appt._id,
        patientId: appt.patientId,
        patientName: patientInfo?.name || '-',
        referredDepartment: '',
        chiefComplaint: String(appt.chiefComplaint || patientInfo?.chiefComplaint || '').trim(),
        status: 'pending',
        statusTag: '',
        resendReason: '',
        hasCaseSheet: false,
        hasPrescription: false,
        caseId: '',
        caseDepartment: '',
        chiefApproval: '',
        assignedAt: appt.createdAt,
        pgName: pg.name,
        pgIdentity: pg.Identity,
        pgDepartment: pg.department,
        bookingId: appt.bookingId,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        appointmentStatus: appt.status,
      });
    });

    res.json({
      success: true,
      pgs: assignedPGs,
      appointments: enrichedAppointments,
      analytics,
    });
  } catch (error) {
    console.error('[Assigned PGs Overview] Error:', error);
    try {
      const fs = await import('fs');
      fs.appendFileSync('debug-pg-appointments.log', `[ERROR] ${error.message}\n${error.stack}\n`);
    } catch(e) {}
    res.status(500).json({ success: false, message: 'Failed to fetch PG overview', error: error.message });
  }
});

// Update a PG's basic details (doctor can update only their own created PGs)
router.patch('/doctor/assigned-pgs/:pgId/update', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { pgId } = req.params;
    const { name, email, phone, department } = req.body || {};

    const pg = await User.findOne({
      _id: pgId,
      role: 'pg',
      createdBy: req.user._id,
    });

    if (!pg) {
      return res.status(404).json({ success: false, message: 'PG not found under your assignment list' });
    }

    // Enforce unique email if email is being changed
    if (email !== undefined && String(email).trim()) {
      const existing = await User.findOne({
        email: String(email).trim(),
        _id: { $ne: pg._id },
      }).lean();

      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    if (name !== undefined) pg.name = String(name).trim();
    if (email !== undefined) pg.email = String(email).trim();
    if (phone !== undefined) pg.phone = String(phone).trim();
    if (department !== undefined) pg.department = String(department).trim();

    await pg.save();

    res.json({
      success: true,
      message: 'PG updated successfully',
      pg: {
        _id: pg._id,
        name: pg.name,
        email: pg.email,
        phone: pg.phone,
        Identity: pg.Identity,
        department: pg.department,
      },
    });
  } catch (err) {
    console.error('Error updating PG:', err);
    res.status(500).json({ success: false, message: 'Failed to update PG' });
  }
});

// Remove a PG from doctor's assigned list
router.patch('/doctor/assigned-pgs/:pgId/unassign', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { pgId } = req.params;

    const pg = await User.findOne({
      _id: pgId,
      role: 'pg',
      createdBy: req.user._id,
    });

    if (!pg) {
      return res.status(404).json({ success: false, message: 'PG not found under your assignment list' });
    }

    pg.createdBy = null;
    await pg.save();

    res.json({
      success: true,
      message: 'PG removed from your assigned list',
      pg: {
        _id: pg._id,
        name: pg.name,
        Identity: pg.Identity,
        department: pg.department,
      },
    });
  } catch (err) {
    console.error('Error unassigning PG:', err);
    res.status(500).json({ success: false, message: 'Failed to unassign PG' });
  }
});

// Update a doctor's basic details (chief can update only their own created doctors)
router.patch('/chief/assigned-doctors/:doctorId/update', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { name, email, phone, department } = req.body || {};
    const requesterDepartment = String(req.user?.department || '').trim();
    const normalizedRequesterDepartment = normalizeDepartmentName(requesterDepartment);

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      createdBy: req.user._id,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found under your assignment list' });
    }

    if (!normalizedRequesterDepartment) {
      return res.status(403).json({ success: false, message: 'Your chief doctor account does not have a department assigned.' });
    }

    if (normalizeDepartmentName(doctor.department) !== normalizedRequesterDepartment) {
      return res.status(403).json({ success: false, message: 'You can only manage doctors from your own department.' });
    }

    if (email !== undefined && String(email).trim()) {
      const existing = await User.findOne({
        email: String(email).trim(),
        _id: { $ne: doctor._id },
      }).lean();

      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    if (name !== undefined) doctor.name = String(name).trim();
    if (email !== undefined) doctor.email = String(email).trim();
    if (phone !== undefined) doctor.phone = String(phone).trim();
    if (department !== undefined) {
      const normalizedRequestedDepartment = normalizeDepartmentName(department);
      if (normalizedRequestedDepartment !== normalizedRequesterDepartment) {
        return res.status(403).json({ success: false, message: 'You cannot move a doctor outside your department.' });
      }
      doctor.department = requesterDepartment;
    }

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        Identity: doctor.Identity,
        department: doctor.department,
      },
    });
  } catch (err) {
    console.error('Error updating doctor:', err);
    res.status(500).json({ success: false, message: 'Failed to update doctor' });
  }
});

router.get('/doctor/assigned-pgs/cases', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const GeneralCase = (await import('../models/GeneralCase.js')).default;

    const doctorIdentity = String(req.user?.Identity || '').trim();
    const rawDoctorIdentity = String(req.user?.Identity || '');
    
    const doctorReferrals = await GeneralCase.find({
      $or: [
        { specialistDoctorId: doctorIdentity },
        { specialistDoctorId: rawDoctorIdentity },
        { specialistDoctorId: req.user._id },
        { specialistDoctorId: String(req.user._id) },
      ],
      specialistStatus: { $in: ['approved', 'pending', 'rescheduled'] }
    }, { assignedPgId: 1 }).lean();
    
    const pgIdentitiesFromReferrals = [...new Set(
      doctorReferrals.map(r => String(r.assignedPgId || '').trim()).filter(Boolean)
    )];
    const pgRawIdentitiesFromReferrals = [...new Set(
      doctorReferrals.map(r => String(r.assignedPgId || '')).filter(Boolean)
    )];

    const assignedPGs = await User.find(
      { 
        role: 'pg',
        $or: [
          { createdBy: req.user._id },
          { Identity: { $in: pgIdentitiesFromReferrals } },
          { Identity: { $in: pgRawIdentitiesFromReferrals } }
        ]
      },
      { Identity: 1, name: 1 }
    ).lean();

    if (!assignedPGs.length) {
      return res.json({ success: true, cases: [] });
    }

    const pgIdentities = assignedPGs.map(pg => pg.Identity).filter(Boolean);
    const pgNames = new Map(assignedPGs.map(pg => [pg.Identity, pg.name]));

    const loadModel = async (path) => {
      try {
        const mod = await import(path);
        return mod.default || mod;
      } catch (e) {
        console.error(`Failed to import model ${path}:`, e.message);
        return null;
      }
    };

    const [pedodonticsModel, completeDentureModel, fpdModel, implantModel, implantPatientModel, partialModel] = await Promise.all([
      loadModel('../models/PedodonticsCase.js'),
      loadModel('../models/CompleteDentureCase.js'),
      loadModel('../models/Fpd-model.js'),
      loadModel('../models/Implant-model.js'),
      loadModel('../models/ImplantPatient-model.js'),
      loadModel('../models/partial-model.js'),
    ]);

    const models = [
      { model: GeneralCase, department: 'General' },
      { model: pedodonticsModel, department: 'Pedodontics' },
      { model: completeDentureModel, department: 'Complete Denture' },
      { model: fpdModel, department: 'FPD' },
      { model: implantModel, department: 'Implant' },
      { model: implantPatientModel, department: 'Implant Patient Surgery' },
      { model: partialModel, department: 'Partial Denture' },
    ];

    const allCases = [];

    const queryPromises = models.map(async ({ model, department }) => {
      if (!model) return [];
      try {
        const cases = await model.find({ doctorId: { $in: pgIdentities } })
          .sort({ createdAt: -1 })
          .lean();
        return cases.map(c => ({
          ...c,
          department,
          pgName: pgNames.get(c.doctorId) || c.doctorName,
        }));
      } catch (err) {
        console.error(`Error fetching ${department} cases:`, err.message);
        return [];
      }
    });

    const results = await Promise.all(queryPromises);
    results.forEach(cases => allCases.push(...cases));

    allCases.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({ success: true, cases: allCases });
  } catch (err) {
    console.error('Error fetching PG cases:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cases from assigned PGs' });
  }
});

// Approve a case from an assigned PG
router.patch('/doctor/assigned-pgs/cases/:caseId/approve', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { department, chiefApproval, approvedBy } = req.body;

    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }

    const modelMap = {
      'General': '../models/GeneralCase.js',
      'Pedodontics': '../models/PedodonticsCase.js',
      'Complete Denture': '../models/CompleteDentureCase.js',
      'FPD': '../models/Fpd-model.js',
      'Implant': '../models/Implant-model.js',
      'Implant Patient Surgery': '../models/ImplantPatient-model.js',
      'Partial Denture': '../models/partial-model.js',
    };

    const modelPath = modelMap[department];
    if (!modelPath) {
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }

    // Import the correct model
    const modelModule = await import(modelPath);
    const Model = modelModule.default || modelModule[Object.keys(modelModule)[0]];

    // Find the case
    const caseItem = await Model.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    // Verify the case belongs to an assigned PG
    const pg = await User.findOne({
      Identity: caseItem.doctorId,
      role: 'pg',
      createdBy: req.user._id,
    });

    if (!pg) {
      return res.status(403).json({ success: false, message: 'You can only approve cases from your assigned PGs' });
    }

    // Update the case
    caseItem.chiefApproval = chiefApproval || 'Approved';
    caseItem.approvedBy = approvedBy || req.user.name;
    caseItem.approvedAt = new Date();

    await caseItem.save();

    res.json({
      success: true,
      message: 'Case approved successfully',
      case: caseItem,
    });
  } catch (err) {
    console.error('Error approving case:', err);
    res.status(500).json({ success: false, message: 'Failed to approve case' });
  }
});

export default router;


