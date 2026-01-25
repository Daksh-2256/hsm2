const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

// START GOOGLE LOGIN
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })
);

// CALLBACK
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", {
    session: false
  }, (err, user, info) => {
    if (err) return next(err);

    // If user not found, redirect to login with a notice so frontend can offer registration
    if (!user) {
      if (info && info.message === "NOT_REGISTERED") {
        const profile = info.profile || {};
        const params = new URLSearchParams();
        // Send user back to login and show a 'no user found' message with a Register button
        params.set("error", "no_user_found");
        params.set("google", "true");
        if (profile.email) params.set("email", profile.email);
        if (profile.name) params.set("name", profile.name);

        return res.redirect(`${process.env.FRONTEND_URL || 'http://127.0.0.1:5501'}/hospital-management-system/frontend/login.html?${params.toString()}`);
      }

      if (info && info.message === "NOT_A_PATIENT") {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://127.0.0.1:5501'}/hospital-management-system/frontend/login.html?error=not_patient`);
      }

      return res.redirect(`${process.env.FRONTEND_URL || 'http://127.0.0.1:5501'}/hospital-management-system/frontend/login.html?error=not_registered`);
    }

    const token = jwt.sign({
      id: user._id,
      role: user.role
    }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    const smallUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim()
    };

    const userParam = encodeURIComponent(JSON.stringify(smallUser));
    return res.redirect(`${process.env.FRONTEND_URL || 'http://127.0.0.1:5501'}/hospital-management-system/frontend/patient-dashboard.html?token=${token}&user=${userParam}`);
  })(req, res, next);
});

module.exports = router;
