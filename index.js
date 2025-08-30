import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import bodyParser from 'body-parser';

const app = express();
app.use(cors({ origin: 'https://idl.thesocialants.com' }));
app.use(bodyParser.json());

app.post('/enquiry', async (req, res) => {
  const { companyName, name, phone, email, selectedProducts, message } = req.body;

  // Send email via Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'lokesh@thesocialants.com',
      pass: process.env.GMAIL_APP_PASSWORD // Set this in Vercel environment variables
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
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), // Set this in Vercel environment variables
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID; // Set this in Vercel environment variables

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
});

app.get('/', (req, res) => {
  res.send('IDL Infra Backend API is running.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
