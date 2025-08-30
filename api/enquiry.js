import nodemailer from 'nodemailer';
import { google } from 'googleapis';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://idl.thesocialants.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Parse body (Vercel parses JSON automatically)
  const { companyName, name, phone, email, selectedProducts, message } = req.body;

  // Send email via Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'lokesh@thesocialants.com',
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const mailOptions = {
    from: 'lokesh@thesocialants.com',
    to: 'lokesh@thesocialants.com',
    subject: 'New Enquiry Received',
    text: `
      Company: ${companyName}
      Name: ${name}
      Phone: ${phone}
      Email: ${email}
      Products: ${selectedProducts.map(p => `${p.name} (${p.quantity} tons)`).join(', ')}
      Message: ${message}
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    return res.status(500).json({ error: 'Email failed', details: err });
  }

  // Google Sheets API setup
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          new Date().toISOString(),
          companyName,
          name,
          phone,
          email,
          selectedProducts.map(p => `${p.name} (${p.quantity} tons)`).join(', '),
          message
        ]]
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Sheet update failed', details: err });
  }

  res.json({ status: 'success' });
}
