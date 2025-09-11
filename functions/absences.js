import { storage } from '../server/storage';
import { insertAbsenceSchema } from '../shared/schema';

export const handler = async (event, context) => {
  const { httpMethod } = event;
  
  try {
    // GET /api/absences
    if (httpMethod === 'GET') {
      const absences = await storage.getAbsences();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(absences)
      };
    }
    
    // POST /api/absences
    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const result = insertAbsenceSchema.safeParse(body);
      
      if (!result.success) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Ugyldig fraværsdata',
            errors: result.error.issues 
          })
        };
      }
      
      const absence = await storage.createAbsence(result.data);
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(absence)
      };
    }
    
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Error in absences function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Feil ved behandling av fravær' 
      })
    };
  }
};