import { storage } from '../server/storage';
import { insertSpainPresenceSchema } from '../shared/schema';

export const handler = async (event, context) => {
  const { httpMethod } = event;
  
  try {
    // GET /api/spain-presence
    if (httpMethod === 'GET') {
      const presences = await storage.getSpainPresence();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presences)
      };
    }
    
    // POST /api/spain-presence
    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const result = insertSpainPresenceSchema.safeParse(body);
      
      if (!result.success) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Ugyldig tilstedeværelsesdata',
            errors: result.error.issues 
          })
        };
      }
      
      const presence = await storage.createSpainPresence(result.data);
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presence)
      };
    }
    
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Error in spain-presence function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Feil ved behandling av Spania-tilstedeværelse' 
      })
    };
  }
};