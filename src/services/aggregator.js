// src/services/aggregator.js
const proxyHandler = require('../api/proxy-handler');

async function aggregateDocument(type, userId) {
  const startTime = performance.now();
  
  // Define candidates based on document type
  let candidates = [];
  if (type === 'aadhaar') {
    candidates.push(
      { name: 'Primary UIDAI Stream', handler: () => proxyHandler.fetch(`/aadhaar/${userId}?mode=live`) },
      { name: 'Backup VView Tunnel', handler: () => proxyHandler.fetch(`/gateway/clone/${userId}`)}
    );
  } else if (type === 'pan') {
    candidates.push(proxyHandler.fetch(`/pan/card-details?pan=${userId}&source=web_clone`));
  }

  // Execute race condition: whoever finishes first wins
  const winners = await Promise.race(candidates.map(promise => ({ promise, name: p.name })));
  
  const duration = performance.now() - startTime;
  console.log(`Aggregate [${winners.name}] completed in ${duration.toFixed(2)}ms`);
  
  return { 
    data: winners.promise, 
    metadata: { aggregated_at: new Date().toISOString(), total_time_ms: duration } 
  };
}

module.exports = aggregateDocument;
