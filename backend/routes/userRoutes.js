const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const path = require('path');
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const auth = require('../middleware/auth');

const router = express.Router();

// REGISTER (patients)
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      age,
      gender
    } = req.body;

    // server-side validation for gender
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.json({
        success: false,
        message: 'Invalid gender'
      });
    }

    // Validate non-negative age
    if (age !== undefined && (isNaN(age) || Number(age) < 0)) {
      return res.json({
        success: false,
        message: 'Age cannot be negative'
      });
    }

    if (!firstName || !email) {
      return res.json({
        success: false,
        message: "Missing required fields"
      });
    }

    let existing = await User.findOne({
      email
    });
    if (existing) {
      return res.json({
        success: false,
        message: "User already exists"
      });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      age: age || undefined,
      gender: gender || undefined,
      password: password || undefined,
      role: "patient",
      isGoogleUser: !password
    });

    await user.save();

    // If registered via Google (no password), issue token immediately
    if (user.isGoogleUser) {
      const token = jwt.sign({
        id: user._id,
        role: user.role
      }, process.env.JWT_SECRET, {
        expiresIn: "7d"
      });
      return res.json({
        success: true,
        message: "User registered",
        token,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    }

    res.json({
      success: true,
      message: "User registered",
      user: {
        _id: user._id,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// REGISTER INIT: create user record with OTP and send OTP to email
router.post("/register-init", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      age,
      gender
    } = req.body;

    // server-side validation for gender
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.json({
        success: false,
        message: 'Invalid gender'
      });
    }

    // Validate non-negative age
    if (age !== undefined && (isNaN(age) || Number(age) < 0)) {
      return res.json({
        success: false,
        message: 'Age cannot be negative'
      });
    }

    if (!firstName || !email || !phone) {
      return res.json({
        success: false,
        message: "Missing required fields"
      });
    }

    let existing = await User.findOne({
      email
    });
    if (existing) {
      return res.json({
        success: false,
        message: "User already exists"
      });
    }

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      age: age || undefined,
      gender: gender || undefined,
      password: password || undefined,
      role: "patient",
      isGoogleUser: !password,
      otp,
      otpExpiry,
      isVerified: false
    });

    await user.save();

    // send OTP email (uses existing util)
    try {
      const sendOtp = require("../utils/sendOtp");
      await sendOtp(email, otp);
    } catch (e) {
      console.error("Failed to send OTP:", e);
      return res.json({
        success: false,
        message: "Failed to send OTP: " + (e.message || "Email error")
      });
    }

    res.json({
      success: true,
      message: "OTP sent to email",
      email: user.email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error: " + err.message
    });
  }
});

// VERIFY OTP and finalize registration
router.post("/verify-otp", async (req, res) => {
  try {
    const {
      email,
      otp
    } = req.body;
    if (!email || !otp) return res.json({
      success: false,
      message: "Missing fields"
    });

    const user = await User.findOne({
      email
    });
    if (!user) return res.json({
      success: false,
      message: "User not found"
    });

    if (!user.otp || !user.otpExpiry) return res.json({
      success: false,
      message: "No OTP requested"
    });

    if (Date.now() > user.otpExpiry) return res.json({
      success: false,
      message: "OTP expired"
    });

    if (user.otp !== otp) return res.json({
      success: false,
      message: "Invalid OTP"
    });

    // OTP correct => mark verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // issue token
    const token = jwt.sign({
      id: user._id,
      role: user.role
    }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      success: true,
      message: "Verified",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// RESEND OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const {
      email
    } = req.body;
    if (!email) return res.json({
      success: false,
      message: "Email required"
    });

    const user = await User.findOne({
      email
    });
    if (!user) return res.json({
      success: false,
      message: "User not found"
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    try {
      const sendOtp = require("../utils/sendOtp");
      await sendOtp(email, otp);
    } catch (e) {
      console.error("Failed to send OTP:", e);
      return res.json({ success: false, message: "Failed to send OTP: " + (e.message || "Email error") });
    }

    res.json({
      success: true,
      message: "OTP resent"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
      role
    } = req.body;

    // 🔐 Role is REQUIRED
    if (!role) {
      return res.json({
        success: false,
        message: "Role is required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: {
        $regex: new RegExp(`^${normalizedEmail}$`, 'i')
      },
      role
    });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found. Please ensure you are logging in with the correct role."
      });
    }

    // 🚫 If only Google login is available (no password set)
    if (user.isGoogleUser && !user.password) {
      return res.json({
        success: false,
        message: "Please login using Google. If you want to use a password, please activate your account first."
      });
    }

    // 🔒 Enforce Activation for Patients
    if (user.role === 'patient' && !user.isAccountActivated) {
      return res.json({ success: false, message: "Account not activated. Please check your email." });
    }

    console.log(`[LOGIN_DEBUG] Email: ${normalizedEmail}, Role: ${role}`);
    console.log(`[LOGIN_DEBUG] User found: ${!!user}`);
    if (user) {
      console.log(`[LOGIN_DEBUG] DB Hash exists: ${!!user.password}`);
      console.log(`[LOGIN_DEBUG] DB Hash start: ${user.password ? user.password.substring(0, 10) : 'NONE'}`);
      console.log(`[LOGIN_DEBUG] Input password length: ${password.trim().length}`);
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    console.log(`[LOGIN_DEBUG] Password match: ${isMatch}`);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials. Please check your password." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// UPDATE user (by id)
router.put('/:id', async (req, res) => {
  try {
    const update = req.body;
    // validate gender if present
    if (update.gender && !['male', 'female', 'other'].includes(update.gender)) {
      return res.json({ success: false, message: 'Invalid gender' });
    }
    // prevent changing email to existing one
    if (update.email) delete update.email;
    // if password provided, it will be hashed by the pre-save hook
    if (update.password) {
      // update.password = update.password (leave as plain text for hook)
    }
    // allow updating gender and age as well
    const allowed = {};
    ['firstName', 'lastName', 'phone', 'age', 'gender', 'password', 'isVerified'].forEach(k => {
      if (update[k] !== undefined) allowed[k] = update[k];
    });
    if (update.password) allowed.password = update.password;
    const u = await User.findByIdAndUpdate(req.params.id, allowed, { new: true });
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: u });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE user
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only doctors or admins can delete patients
    if (!req.user || (req.user.role !== 'doctor' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const patientId = req.params.id;
    const user = await User.findById(patientId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (user.role !== 'patient') {
      return res.status(400).json({ success: false, message: 'Only patient records can be deleted this way' });
    }

    // Cascade Delete related data will handle appointments regardless of status

    // 1. Find all prescriptions to delete PDFs
    const prescriptions = await Prescription.find({ patientId: patientId });
    for (const p of prescriptions) {
      if (p.pdfPath && fs.existsSync(p.pdfPath)) {
        try {
          fs.unlinkSync(p.pdfPath);
        } catch (e) {
          console.error(`Failed to delete PDF at ${p.pdfPath}:`, e);
        }
      }
    }

    // 2. Cascade Delete related data
    await Appointment.deleteMany({ patientId: patientId });
    await Prescription.deleteMany({ patientId: patientId });

    // 3. Delete the Patient User record
    await User.findByIdAndDelete(patientId);

    res.json({ success: true, message: 'Patient deleted permanently' });
  } catch (err) {
    console.error('Delete Patient Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// search patients (protected)
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    // only allow doctors or admins to search patients
    if (!req.user || (req.user.role !== 'doctor' && req.user.role !== 'admin')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await require('../models/User').find({
      role: 'patient',
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }]
    }).limit(12).select('firstName lastName phone email isAccountActivated');
    res.json(users.map(u => ({
      id: u._id,
      name: (u.firstName || '') + (u.lastName ? (' ' + u.lastName) : ''),
      phone: u.phone,
      email: u.email,
      isAccountActivated: u.isAccountActivated
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// --- ACTIVATION ROUTES ---

// 1. INVITE PATIENT (Doctor Action)
router.post("/invite", auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    const { firstName, lastName, email, phone, age, gender } = req.body;

    if (!email) return res.json({ success: false, message: "Email required" });

    let user = await User.findOne({ email });
    if (user && user.isAccountActivated) {
      return res.json({ success: false, message: "User already active" });
    }

    if (!user) {
      // Create new inactive user
      user = new User({
        firstName, lastName, email, phone, age, gender,
        role: 'patient',
        isAccountActivated: false
      });
    }

    // Generate Token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    user.activationToken = token;
    user.activationTokenExpiry = Date.now() + 24 * 3600 * 1000; // 24h

    await user.save();

    // Send Email
    try {
      const sendActivation = require('../utils/sendActivation');
      await sendActivation(email, token, req.headers.host);
      res.json({ success: true, message: "Invitation sent" });
    } catch (e) {
      console.error("Invite Email Error:", e);
      // Return success false but mention the patient was created
      res.status(500).json({
        success: false,
        message: "Patient created, but failed to send email. " + (e.message || "Email server error.")
      });
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. RESEND ACTIVATION (Doctor Action - Token Based re-send)
router.post("/resend-activation", auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') return res.status(403).json({ success: false });
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.isAccountActivated) return res.json({ success: false, message: "Already active" });

    // Generate Token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    user.activationToken = token;
    user.activationTokenExpiry = Date.now() + 24 * 3600 * 1000;
    await user.save();

    const sendActivation = require('../utils/sendActivation');
    await sendActivation(email, token, req.headers.host);

    res.json({ success: true, message: "Activation email resent" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// NEW: SEND ACTIVATION OTP (Patient Action)
router.post("/send-activation-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "No patient record found. Please contact clinic." });
    if (user.isAccountActivated) return res.json({ success: false, message: "Account already activated. Please login." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    const sendOtp = require("../utils/sendOtp");
    await sendOtp(email, otp);

    res.json({ success: true, message: "OTP sent to email." });
  } catch (e) {
    console.error(e);
    // Send specific error to frontend so the user knows what's wrong (e.g. Invalid Login)
    res.status(500).json({ success: false, message: "Failed to send OTP: " + (e.message || "Unknown error") });
  }
});

// 3. ACTIVATE ACCOUNT (Patient Action - Support OTP or Token)
router.post("/activate", async (req, res) => {
  try {
    const { email, token, otp, password } = req.body;
    let user;

    if (token) {
      // Token Flow
      user = await User.findOne({
        email,
        activationToken: token,
        activationTokenExpiry: { $gt: Date.now() }
      });
      if (!user) return res.json({ success: false, message: "Invalid or expired activation details. Please try again." });
    } else if (otp) {
      // OTP Flow
      user = await User.findOne({ email });
      if (!user) return res.json({ success: false, message: "No patient record found. Please contact clinic." });

      console.log(`[ACTIVATE_DEBUG] User found: ${email}`);
      console.log(`[ACTIVATE_DEBUG] Input OTP: '${otp}', Type: ${typeof otp}`);
      console.log(`[ACTIVATE_DEBUG] DB OTP: '${user.otp}', Type: ${typeof user.otp}`);
      console.log(`[ACTIVATE_DEBUG] Expiry: ${user.otpExpiry}, Now: ${Date.now()}, IsExpired: ${Date.now() > user.otpExpiry}`);

      // Allow re-activation to fix potential password issues
      // if (user.isAccountActivated) return res.json({ success: false, message: "Account already activated. Please login." });

      if (!user.otp || !user.otpExpiry || Date.now() > user.otpExpiry || String(user.otp).trim() !== String(otp).trim()) {
        console.log(`[ACTIVATE_DEBUG] Validation Failed`);
        return res.json({ success: false, message: "Invalid or expired activation details. Please try again." });
      }
    } else {
      return res.json({ success: false, message: "Missing verification details" });
    }

    // Set password (pre-save hook will hash it)
    user.password = password;
    user.isAccountActivated = true;
    user.activationToken = undefined;
    user.activationTokenExpiry = undefined;
    user.otp = undefined;
    user.otpExpiry = undefined;

    // Also mark verified
    user.isVerified = true;

    await user.save();

    // Send Success Email
    try {
      const transporter = require('../utils/email');
      await transporter.sendMail({
        from: `"Samyak Hospital" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Account Activated",
        text: "Account activated successfully. You may now login."
      });
    } catch (e) { }

    res.json({ success: true, message: "Account activated successfully. You may now login." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET user by ID (Generic - Keep at bottom)
router.get('/:id', auth, async (req, res) => {
  try {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID format' });
    }
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
