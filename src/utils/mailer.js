const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendAlbumAccessEmail = async ({ toEmail, toName, albumTitle, photographerName, accessUrl }) => {
  const mailOptions = {
    from: `"CoupleCanvas" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your wedding album is ready — ${albumTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#333">
        <h2 style="margin-bottom:8px">Hi ${toName},</h2>
        <p>Your photographer <strong>${photographerName}</strong> has shared your wedding album <strong>"${albumTitle}"</strong> with you.</p>
        <p>Click the button below to view your album:</p>
        <a href="${accessUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#534AB7;color:#fff;border-radius:8px;text-decoration:none;font-weight:500">
          View album
        </a>
        <p style="color:#888;font-size:13px;margin-top:24px">
          You can also share this link with family and friends — anyone with the link can view it.
        </p>
        <p style="color:#bbb;font-size:12px">${accessUrl}</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendAlbumAccessEmail };