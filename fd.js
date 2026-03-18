// Vercel Serverless Function: api/fd.js
// Proxies football-data.org requests – API key stays server-side

const https = require('https');

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const apiKey = process.env.FD_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'FD_API_KEY not set in Vercel environment variables' });
    return;
  }

  const path = req.query.path;
  if (!path) {
    res.status(400).json({ error: 'Missing ?path= parameter' });
    return;
  }

  const url = `https://api.football-data.org/v4${path}`;

  try {
    const { status, body } = await httpsGet(url, {
      'X-Auth-Token': apiKey,
      'Accept': 'application/json',
    });

    let data;
    try { data = JSON.parse(body); }
    catch(e) {
      res.status(status).json({ error: `Non-JSON response: ${body.slice(0,200)}`, url });
      return;
    }

    res.status(status).json(data);
  } catch(err) {
    res.status(500).json({ error: err.message, url });
  }
};
