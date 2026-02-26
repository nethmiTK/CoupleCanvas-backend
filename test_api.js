const fetch = require('node-fetch');

async function testAlbumVendorsAPI() {
  try {
    const response = await fetch('http://localhost:4000/api/album-vendors');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ API Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testAlbumVendorsAPI();