// Test the unified API endpoint
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing unified expand API...');

    const response = await fetch('http://localhost:3000/api/v3/unified/expand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: 'test payroll system'
      })
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
