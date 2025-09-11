import { storage } from '../server/storage';
import { insertTeeTimeSchema } from '../shared/schema';

export const handler = async (event, context) => {
  const { httpMethod } = event;
  
  try {
    // GET /api/tee-times
    if (httpMethod === 'GET') {
      const teeTimes = await storage.getTeeTimes();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teeTimes)
      };
    }
    
    // POST /api/tee-times
    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const result = insertTeeTimeSchema.safeParse(body);
      
      if (!result.success) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Ugyldig tee-time data',
            errors: result.error.issues 
          })
        };
      }
      
      const teeTime = await storage.createTeeTime(result.data);
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teeTime)
      };
    }
    
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Error in tee-times function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Feil ved behandling av tee-times' 
      })
    };
  }
};