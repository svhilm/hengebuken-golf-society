import { MailService } from '@sendgrid/mail';

// Debug SendGrid configuration
export async function debugSendGridConfig(): Promise<void> {
  console.log('\n=== SENDGRID DEBUG INFORMASJON ===');
  console.log('API Key present:', !!process.env.SENDGRID_API_KEY);
  console.log('API Key length:', process.env.SENDGRID_API_KEY?.length || 0);
  console.log('API Key starts with SG.:', process.env.SENDGRID_API_KEY?.startsWith('SG.') || false);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY mangler');
    return;
  }

  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);

  // Test a simple verification call
  try {
    console.log('Testing SendGrid API connection...');
    
    // Try to send a test email to see what specific error we get
    await mailService.send({
      to: 'svhilm13@gmail.com',
      from: 'svhilm13@gmail.com', // Same email as sender and receiver for testing
      subject: 'SendGrid Test',
      text: 'This is a test email to verify SendGrid configuration.',
    });
    
    console.log('✅ SendGrid test email sent successfully!');
    
  } catch (error: any) {
    console.log('❌ SendGrid test failed:');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    
    if (error.response?.body?.errors) {
      console.log('Specific errors:');
      error.response.body.errors.forEach((err: any, index: number) => {
        console.log(`  ${index + 1}. Field: ${err.field}`);
        console.log(`     Message: ${err.message}`);
        if (err.help) console.log(`     Help: ${err.help}`);
      });
    }
    
    // Common SendGrid issues and solutions
    if (error.code === 401) {
      console.log('\n💡 LØSNING FOR 401:');
      console.log('- Sjekk at API-nøkkel er korrekt');
      console.log('- Sjekk at API-nøkkel har "Mail Send" tillatelser');
    }
    
    if (error.code === 403) {
      console.log('\n💡 LØSNING FOR 403:');
      console.log('- E-postadresse må verifiseres i SendGrid');
      console.log('- Gå til Settings → Sender Authentication');
      console.log('- Velg "Single Sender Verification"');
      console.log('- Legg til og bekreft e-postadressen: svhilm13@gmail.com');
    }
  }
  
  console.log('=====================================\n');
}