const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (email, otp) => {
  console.log("Sending OTP via Resend:", otp);

  try {
    await resend.emails.send({
      from: "Samyak Hospital <onboarding@resend.dev>",
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Samyak Ayurvedic Hospital</h2>
        <h1>Your OTP is: ${otp}</h1>
        <p>Valid for 5 minutes.</p>
      `
    });

    console.log("OTP sent successfully");
  } catch (err) {
    console.error("Resend Error:", err);
    throw err;
  }
};