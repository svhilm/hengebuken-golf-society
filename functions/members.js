import { storage } from '../server/storage';
import { insertMemberSchema } from '../shared/schema';

export const handler = async (event, context) => {
  const { httpMethod, path } = event;
  
  try {
    // GET /api/members
    if (httpMethod === 'GET') {
      const members = await storage.getMembers();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(members)
      };
    }
    
    // POST /api/members
    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const result = insertMemberSchema.safeParse(body);
      
      if (!result.success) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Ugyldig medlemsdata',
            errors: result.error.issues 
          })
        };
      }
      
      const member = await storage.createMember(result.data);
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      };
    }
    
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Error in members function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Feil ved behandling av medlemmer' 
      })
    };
  }
};