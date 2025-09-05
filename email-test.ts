import { MailService } from '@sendgrid/mail';

// Direct SendGrid API test
export async function testSendGridDirectly(): Promise<void> {
  console.log('\n=== DIREKTE SENDGRID API TEST ===');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY mangler');
    return;
  }

  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);

  // Test with exact same configuration as working examples
  const testEmail = {
    to: 'svhilm13@gmail.com',
    from: 'svhilm13@gmail.com', // Same as verified address
    subject: 'HENGEBUKEN - Direct API Test',
    text: 'This is a direct SendGrid API test from HENGEBUKEN system.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">HENGEBUKEN</h2>
        <p>This is a direct SendGrid API test.</p>
        <p>If you receive this email, SendGrid is working correctly!</p>
      </div>
    `
  };

  try {
    console.log('Sending test email with configuration:');
    console.log('- To:', testEmail.to);
    console.log('- From:', testEmail.from);
    console.log('- Subject:', testEmail.subject);
    
    const response = await mailService.send(testEmail);
    
    console.log('✅ SUCCESS! Test email sent successfully');
    console.log('Response status:', response[0]?.statusCode);
    console.log('Message ID:', response[0]?.headers?.['x-message-id']);
    
  } catch (error: any) {
    console.log('❌ FAILED to send test email');
    console.log('Full error object:', JSON.stringify(error, null, 2));
    
    // Check for specific API key issues
    if (error.code === 401) {
      console.log('\n🔍 API KEY ISSUE:');
      console.log('- API key may be invalid or revoked');
      console.log('- Check API key permissions in SendGrid dashboard');
      console.log('- Ensure key has "Mail Send" permissions');
    }
    
    if (error.code === 403 && error.message.includes('Sender Identity')) {
      console.log('\n🔍 SENDER IDENTITY ISSUE:');
      console.log('- Email must be EXACTLY verified in SendGrid');
      console.log('- Check case sensitivity: svhilm13@gmail.com');
      console.log('- Verify status should be "Verified" (green)');
      console.log('- Try adding domain authentication instead');
    }
    
    if (error.response?.body?.errors) {
      console.log('\n📋 DETAILED ERRORS:');
      error.response.body.errors.forEach((err: any, index: number) => {
        console.log(`${index + 1}. ${err.field}: ${err.message}`);
      });
    }
  }
  
  console.log('=====================================\n');
}