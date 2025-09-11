import { storage } from '../server/storage';

export const handler = async (event, context) => {
  const { httpMethod } = event;
  
  try {
    // POST /api/auth/login
    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { name, password } = body;
      
      if (!name || !password) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: "Navn og passord er påkrevd" 
          })
        };
      }
      
      const user = await storage.authenticateUserByName(name.trim(), password.trim());
      
      if (!user) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: "Ugyldig brukernavn eller passord" 
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        })
      };
    }
    
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error("Error during authentication:", error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "Feil ved autentisering" 
      })
    };
  }
};