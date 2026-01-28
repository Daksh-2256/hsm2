require("dotenv").config(); // must be first

const express = require("express");
const passport = require("passport");
const connectDB = require("./config/db");
require("./passport/googleStrategy");
require("./jobs/reminderCron"); // Start Reminder Job

const app = express();

// Connect to DB
connectDB();

app.use(express.json({
  limit: '50mb'
}));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true
}));
app.use(passport.initialize());
app.use(require('cors')());

// Serve Static Frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/auth", require("./routes/googleAuth"));
app.use("/api/doctors", require("./routes/doctorRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/medicines", require("./routes/medicineRoutes"));
app.use("/api/prescriptions", require("./routes/prescriptionRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/doctor/appointments", require("./routes/doctorAppointmentRoutes"));

// health route for quick checks
app.get("/", (req, res) => res.json({
  status: "ok",
  env: process.env.NODE_ENV || "development"
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
