export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'hengebuken-netlify-functions'
    })
  };
};