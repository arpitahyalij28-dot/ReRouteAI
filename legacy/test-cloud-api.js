// Test local server endpoints
async function runTests() {
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const health = await healthRes.json();
    console.log('API /api/health:', health);

    const configRes = await fetch('http://localhost:3000/api/config');
    const config = await configRes.json();
    console.log('API /api/config:', config);

    const indexRes = await fetch('http://localhost:3000/index.html');
    console.log('index.html status:', indexRes.status, 'bytes:', (await indexRes.text()).length);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
