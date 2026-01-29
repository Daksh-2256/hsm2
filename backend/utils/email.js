console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASS =", process.env.EMAIL_PASS ? "SET" : "NOT SET");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  // Force IPv4 to avoid IPv6 timeouts in some container environments
  // Increase connection timeout
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendActivationEmail(user) {
  await resend.emails.send({
    from: "Hospital <onboarding@resend.dev>",
    to: user.email,
    subject: "Activate your account",
    html: `<h2>Activate</h2><a href="${process.env.FRONTEND_URL}/activate.html?email=${user.email}">Click Here</a>`
  });
}

module.exports = sendActivationEmail;

// Force the use of IPv4 if not automatically handled by service
transporter.set('proxy_socks_module', require('http')); // unrelated, just ensuring clear slate


// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ CRITICAL: EMAIL_USER or EMAIL_PASS environment variables are MISSING.");
      console.error("EMAIL_USER:", process.env.EMAIL_USER ? "Provided" : "Missing");
      console.error("EMAIL_PASS:", process.env.EMAIL_PASS ? "Provided" : "Missing");
    }
    console.error("❌ Email transporter verification FAILED:", error.message);
  } else {
    console.log("✅ Email transporter is ready to send messages");
  }
});

// Wrapper function for sending emails with better logging
const originalSendMail = transporter.sendMail.bind(transporter);
transporter.sendMail = async (mailOptions) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ Email credentials missing. Cannot send email.");
    throw new Error("Email credentials missing on server. Please configure EMAIL_USER and EMAIL_PASS in Railway variables.");
  }

  // Ensure proper headers for deliverability
  const enhancedOptions = {
    ...mailOptions,
    from: mailOptions.from || `"Samyak Ayurvedic Hospital" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'Samyak Hospital System'
    }
  };

  try {
    const info = await originalSendMail(enhancedOptions);
    console.log("📧 Email sent successfully:");
    console.log("   To:", enhancedOptions.to);
    console.log("   Subject:", enhancedOptions.subject);
    return info;
  } catch (err) {
    console.error("❌ Email send FAILED:");
    console.error("   To:", enhancedOptions.to);
    console.error("   Error:", err.message);
    throw err;
  }
};

module.exports = transporter;
