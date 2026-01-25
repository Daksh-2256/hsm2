const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  manufacturer: String,
  category: { type: String, enum: ['tablets', 'liquids', 'others'], default: 'others' },
  quantity: { type: Number, default: 0 },
  alertLevel: { type: Number, default: 10 },
  expiry: Date
});

module.exports = mongoose.model('Medicine', MedicineSchema);
