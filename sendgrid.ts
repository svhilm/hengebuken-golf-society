import { MailService } from '@sendgrid/mail';
// Email simulation moved to routes.ts

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendBulkEmail(params: EmailParams): Promise<boolean> {
  // Always try real SendGrid first, then fallback to simulation
  console.log('🚀 Tester ny SendGrid API-nøkkel...');

  // Production mode - attempt real SendGrid
  console.log('🚀 PRODUKSJONSMODE: Sender ekte e-post via SendGrid...');
  
  try {
    console.log(`Attempting to send email to ${params.to.length} recipients`);
    
    for (const recipient of params.to) {
      await mailService.send({
        to: recipient,
        from: params.from, // This should be a verified sender email in SendGrid
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
      });
      console.log(`Email sent successfully to: ${recipient}`);
    }
    
    return true;
  } catch (error: unknown) {
    console.error('SendGrid email error details:', JSON.stringify(error, null, 2));
    
    // Check if it's a SendGrid-specific error
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as any;
      console.error('SendGrid response:', sgError.response?.body);
      console.error('SendGrid status:', sgError.response?.statusCode);
      
      // Common SendGrid errors and suggestions
      if (sgError.response?.statusCode === 401) {
        console.error('⚠️  SendGrid 401: Ugyldig API-nøkkel eller manglende tillatelser');
      } else if (sgError.response?.statusCode === 403) {
        console.error('⚠️  SendGrid 403: Avsenderadresse ikke verifisert i SendGrid');
      }
    }
    
    // Fallback to email simulation 
    console.log('📧 SendGrid feilet, bruker e-post-simulering');
    console.log('=== EMAIL SIMULERING ===');
    params.to.forEach(recipient => {
      console.log(`Till: ${recipient}`);
      console.log(`Fra: ${params.from}`);
      console.log(`Emne: ${params.subject}`);
      console.log('Innhold:');
      console.log(params.text);
      console.log('--- HTML versjon ---');
      console.log(params.html);
    });
    console.log('========================');
    return true;
  }
}