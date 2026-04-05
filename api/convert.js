// api/convert.js - Serverless function that securely uses your API key
export default async function handler(req, res) {
  // Enable CORS for your frontend
  const allowedOrigins = [
    'https://doc-converter-wheat.vercel.app/',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get API key from Vercel environment variable (SECURE - never exposed to client!)
    const API_KEY = process.env.CONVERTAPI_KEY;
    
    if (!API_KEY) {
      console.error('CONVERTAPI_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'Server configuration error: API key missing' 
      });
    }
    
    // Get the uploaded file from the request
    const file = req.body.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // Prepare FormData for ConvertAPI
    const formData = new FormData();
    formData.append('File', file);
    formData.append('StoreFile', 'true');
    formData.append('Async', 'false');
    
    // Forward to ConvertAPI with the secret key (client never sees this!)
    const response = await fetch(
      `https://v2.convertapi.com/convert/office/to/pdf?token=${API_KEY}`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.Message || 'Conversion failed');
    }
    
    const data = await response.json();
    
    // Return the result to the client
    return res.status(200).json({
      success: true,
      files: data.Files,
      conversionCost: data.ConversionCost
    });
    
  } catch (error) {
    console.error('Conversion error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Conversion failed'
    });
  }
}
