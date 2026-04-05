export const config = {
  api: {
    bodyParser: false, // Important: Disable bodyParser for file uploads
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const API_KEY = process.env.CONVERTAPI_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // Read the raw request body
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers);
    
    // Get the content type from the request
    const contentType = req.headers['content-type'];
    
    // Forward the request to ConvertAPI
    const response = await fetch(
      `https://v2.convertapi.com/convert/office/to/pdf?token=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Content-Length': rawBody.length.toString()
        },
        body: rawBody
      }
    );
    
    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      files: data.Files,
      conversionCost: data.ConversionCost
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
