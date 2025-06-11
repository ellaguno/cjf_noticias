const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

const sampleSources = [
  {
    name: 'CNN en Español',
    base_url: 'https://cnnespanol.cnn.com',
    rss_url: 'https://cnnespanol.cnn.com/feed/',
    logo_url: 'https://cnnespanol.cnn.com/wp-content/uploads/sites/2/2022/08/CNN_en_Espanol_logo.png',
    fetch_frequency: 60
  },
  {
    name: 'BBC Mundo',
    base_url: 'https://www.bbc.com/mundo',
    rss_url: 'https://feeds.bbci.co.uk/mundo/rss.xml',
    logo_url: 'https://static.files.bbci.co.uk/ws/simorgh-assets/public/mundo/images/metadata/poster-1024x576.png',
    fetch_frequency: 60
  },
  {
    name: 'El Universal',
    base_url: 'https://www.eluniversal.com.mx',
    rss_url: 'https://www.eluniversal.com.mx/rss.xml',
    logo_url: 'https://www.eluniversal.com.mx/sites/all/themes/eluniversal/logo.png',
    fetch_frequency: 90
  },
  {
    name: 'Milenio',
    base_url: 'https://www.milenio.com',
    rss_url: 'https://www.milenio.com/rss',
    logo_url: 'https://www.milenio.com/uploads/media/2019/04/18/logo-milenio-redes-sociales.jpg',
    fetch_frequency: 90
  },
  {
    name: 'Reuters en Español',
    base_url: 'https://www.reuters.com/world/americas',
    rss_url: 'https://feeds.reuters.com/reuters/MXdomesticNews',
    logo_url: 'https://www.reuters.com/pf/resources/images/reuters/logos/reuters-logo.svg',
    fetch_frequency: 120
  }
];

async function addSources() {
  console.log('Adding sample external news sources...\n');
  
  for (const source of sampleSources) {
    try {
      console.log(`Adding ${source.name}...`);
      
      const response = await fetch(`${API_BASE}/external-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(source)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Successfully added ${source.name}`);
      } else {
        console.log(`❌ Failed to add ${source.name}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error adding ${source.name}: ${error.message}`);
    }
  }
  
  console.log('\n✨ Sample sources setup complete!');
  console.log('\nTo fetch articles from these sources:');
  console.log('1. Go to /admin/external-sources in your browser');
  console.log('2. Click "Fetch from All Sources"');
  console.log('3. Or use individual "Fetch" buttons for each source');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/status`);
    if (response.ok) {
      console.log('✅ Server is running\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm run dev (from the server directory)');
    console.log('   or');
    console.log('   node server/index.js\n');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await addSources();
  }
}

main().catch(console.error);