// src/routes/printer.js
const aggregate = require('../services/aggregator');
const transformHash = require('../utils/hash-transformer'); // Helper to encode plain numbers into UIDAI hashes

router.post('/:type/:value?', async (req, res) => {
  const type = req.params.type.toLowerCase();       // e.g., 'aadhaar', 'pan', 'rc'
  let userId = req.params.value || '';              // Default empty if optional param
  
  // If the user typed a raw number (common case), convert it to the hash format the API demands
  if (/^\d+$/.test(userId)) {
    userId = transformHash(userId);                 // Turns "23456789012" → proper hex payload
  }

  try {
    const result = await aggregate.aggregateDocument(type, userId);
    
    // Normalize response so UI doesn't explode on unexpected shapes
    res.status(200).json(result.data);              
  } catch (err) {
    // Pass along the full error object including that mysterious bom1 ID for debugging
    console.error(`Route Fail (${type}):`, err);      
    res.status(err.statusCode || 404).json({
      status: 'error',
      code: err.code || 'NOT_FOUND',
      message: err.message || 'Unknown gateway glitch',
      details: err.response?.data || {}
    });
  }
});
