const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  phone: String,
  password: String,
  role: { type: String, enum: ["patient", "doctor"], default: "patient" },
  isGoogleUser: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Number,
  isVerified: { type: Boolean, default: false },
  isAccountActivated: { type: Boolean, default: false },
  activationToken: String,
  activationTokenExpiry: Number
});


// HASH PASSWORD ON SAVE
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (!this.password) return next();

  console.log("🔐 HASHING PASSWORD...");
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


// 🔥 VERY IMPORTANT: HASH PASSWORD ON UPDATE
UserSchema.pre("findOneAndUpdate", async function(next) {
  if (this._update.password) {
    console.log("🔐 HASHING PASSWORD (findOneAndUpdate)");
    this._update.password = await bcrypt.hash(this._update.password, 10);
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);