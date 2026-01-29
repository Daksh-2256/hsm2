const nodemailer = require("nodemailer");

const transporter = require("./email");

module.exports = async (email, otp) => {
  console.log(`[sendOtp] Sending OTP ${otp} to ${email}`);
  const mailOptions = {
    from: `"Samyak Hospital" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Verification Code",
    html: `
      <h2>OTP Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>Valid for 5 minutes.</p>
    `
  };

  try {
    // Timeout race to prevent hanging
    const sendEmailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email sending timed out (25s). Check internet connection or server credentials.")), 25000)
    );

    await Promise.race([sendEmailPromise, timeoutPromise]);
    console.log(`[sendOtp] OTP sent successfully to ${email}`);
  } catch (error) {
    console.error(`[sendOtp] Failed to send OTP to ${email}:`, error.message);
    throw error;
  }
};
// OTP sender utility — sends an email using configured transporter
