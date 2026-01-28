const nodemailer = require("nodemailer");

const transporter = require("./email");

module.exports = async (email, otp) => {
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

  // Timeout race to prevent hanging
  const sendEmailPromise = transporter.sendMail(mailOptions);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Email sending timed out (10s). Check server credentials.")), 10000)
  );

  await Promise.race([sendEmailPromise, timeoutPromise]);
};
// OTP sender utility — sends an email using configured transporter
