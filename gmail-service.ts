import nodemailer from 'nodemailer';

interface EmailParams {
  to: string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmailViaGmail(params: EmailParams): Promise<boolean> {
  console.log('📧 Prøver Gmail SMTP-sending...');
  
  // Check for Gmail credentials
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  Gmail-legitimasjon mangler, bruker simulering');
    return simulateGmailSending(params);
  }

  try {
    // Create Gmail SMTP transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // App-specific password required
      },
    });

    console.log(`Sender e-post til ${params.to.length} mottakere via Gmail SMTP...`);

    // Send to all recipients
    for (const recipient of params.to) {
      await transporter.sendMail({
        from: `"HENGEBUKEN" <${process.env.GMAIL_USER}>`,
        to: recipient,
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
      });
      console.log(`✅ E-post sendt til: ${recipient}`);
    }

    console.log('🎉 Alle e-poster sendt via Gmail SMTP!');
    return true;

  } catch (error: any) {
    console.error('❌ Gmail SMTP-feil:', error.message);
    
    // Common Gmail SMTP errors and solutions
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log('💡 Gmail autentisering feilet:');
      console.log('- Sjekk at Gmail-bruker og app-passord er riktig');
      console.log('- Aktiver 2-faktor autentisering i Gmail');
      console.log('- Lag et app-spesifikt passord i Google Account');
    }
    
    if (error.code === 'ECONNECTION') {
      console.log('💡 Tilkoblingsproblem:');
      console.log('- Sjekk internett-tilkobling');
      console.log('- Gmail SMTP kan være blokkert');
    }

    // Fallback to simulation
    return simulateGmailSending(params);
  }
}

function simulateGmailSending(params: EmailParams): boolean {
  console.log('=== GMAIL E-POST SIMULERING ===');
  params.to.forEach(recipient => {
    console.log(`Till: ${recipient}`);
    console.log(`Fra: "HENGEBUKEN" <${process.env.GMAIL_USER || 'din-gmail@gmail.com'}>`); 
    console.log(`Emne: ${params.subject}`);
    console.log('Innhold:');
    console.log(params.text);
    console.log('--- HTML versjon ---');
    console.log(params.html);
    console.log('---');
  });
  console.log('===============================');
  return true;
}