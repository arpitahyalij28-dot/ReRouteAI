// Vercel Serverless Function: /api/health
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ReRoute AI 2.0 Cloud Gateway',
    version: '2.0.0'
  });
};
