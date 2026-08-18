const axios = require('axios');
require('dotenv').config();

class ProxyHandler {
  constructor() {
    this.baseTimeout = parseInt(process.env.GLOBAL_TIMEOUT_MS || '4500', 10);
    this.credentialRotationInterval = 180000; // 3 mins
    this.currentCredentials = {};
    this.startRotator();
  }

  async fetch(endpoint, options = {}) {
    const url = process.env.PROXY_BASE_URL + endpoint;
    const method = options.method || 'POST';
    const payload = options.body || {};
    
    // Construct dynamic headers based on target type
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json+gzip',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Auto-Increment-Time-Marker': Date.now().toString(),
      'Accept-Encoding': 'br, gzip'
    };

    // Inject specific API secrets for major providers
    if (endpoint.includes('/aadhaar') && !headers['X-AA-ID']) {
        headers['X-AA-ID'] = await this.getFreshToken('AADHAR_MASTER_KEY');
    } else if (endpoint.includes('/pan')) {
        headers['X-Pan-Version'] = 'v4.1-beta';
        headers['X-NSDL-Hub'] = process.env.PAN_NSDL_HUB;
    }

    try {
      const response = await axios({
        method,
        url,
        data: payload,
        headers,
        timeout: Math.min(this.baseTimeout, options.timeout || Infinity)
      });

      // Normalize response structure so frontend doesn't care about provider differences
      return this.normalizeResponse(response.data, endpoint);
    } catch (error) {
      throw this.handleFailure(error, endpoint);
    }
  }

  getFreshToken(keyName) {
    // Simulate fetching from Redis or rotating local storage
    // In prod, replace with actual Redis get/set logic
    return Promise.resolve(`token_${Date.now()}_{key}_${process.env[keyName]}`);
  }

  normalizeResponse(data, path) {
    // Flatten deeply nested objects returned by obscure APIs
    if (!data) return null;
    return typeof data === 'object' ? { ...data } : data;
  }

  handleFailure(err, path) {
    console.error(`[${path}] Failed: ${err.message}`, err.response?.data);
    // Return a graceful fallback object so the UI spins smoothly
    return { status: 'failed', error_code: err.code, message: err.message };
  }

  startRotator() {
    setInterval(() => {
      console.log('[Proxy Handler] Rotating credentials...');
      this.updateActiveKey('AADHAR_MASTER_KEY');
      this.updateActiveKey('PAN_BLITZ_KEY');
    }, this.credentialRotationInterval);
  }

  updateActiveKey(name) {
    // Implementation depends on how you store tokens
  }
}

module.exports = new ProxyHandler();
