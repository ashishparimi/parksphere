#!/usr/bin/env node

/**
 * Script to enrich park data with detailed information using Groq AI
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function enrichParkData() {
  console.log('🤖 Enriching park data with AI...\n');

  try {
    // Read existing parks data
    const parksPath = path.join(__dirname, '../client/public/data/parks.json');
    const parksData = JSON.parse(await fs.readFile(parksPath, 'utf-8'));
    
    console.log(`Found ${parksData.parks.length} parks to enrich\n`);

    // Call the API endpoint to enrich all parks
    const response = await fetch('http://localhost:3000/api/enrich-park-data', {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('\nEnrichment results:');
    
    // Update parks data with enriched information
    const successfulEnrichments = result.results.filter(r => r.status === 'success');
    
    for (const enrichment of successfulEnrichments) {
      const parkIndex = parksData.parks.findIndex(p => p.code === enrichment.parkCode);
      if (parkIndex !== -1) {
        parksData.parks[parkIndex].enrichedData = enrichment.data.enrichedData;
        console.log(`✅ ${enrichment.parkCode} - Enriched successfully`);
      }
    }

    // Save updated parks data
    await fs.writeFile(
      parksPath,
      JSON.stringify(parksData, null, 2)
    );

    console.log(`\n✨ Enrichment complete! Updated ${successfulEnrichments.length} parks.`);
    
    // Show any errors
    const errors = result.results.filter(r => r.status === 'error');
    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(e => console.log(`   - ${e.parkCode}: ${e.error}`));
    }

  } catch (error) {
    console.error('❌ Enrichment failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/mascot', {
      method: 'GET'
    });
    return response.ok || response.status === 405; // 405 means endpoint exists but wrong method
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Checking if Next.js server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Next.js server is not running!');
    console.log('\nPlease start the server first:');
    console.log('  cd client && pnpm dev\n');
    process.exit(1);
  }

  console.log('✅ Server is running\n');
  
  await enrichParkData();
}

main().catch(console.error);