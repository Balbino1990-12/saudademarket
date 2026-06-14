require('dotenv').config();
const mysql = require('mysql2/promise');

async function testAnalyticsEndpoints() {
  try {
    // Initialize database first
    const { initDatabase } = require('./src/config/database');
    await initDatabase();

    const Analytics = require('./src/models/Analytics');

    console.log('🔍 Testing Analytics Endpoints\n');

    // Test getSummary
    console.log('Testing Analytics.getSummary()...');
    const summary = await Analytics.getSummary();
    console.log('Summary result:', summary);

    // Test getEvents
    console.log('\nTesting Analytics.getEvents()...');
    const events = await Analytics.getEvents({ limit: 5 });
    console.log(`Found ${events.length} events (showing first 5):`);
    events.forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.event_type} - ${event.url} - ${event.created_at}`);
    });

    // Test getEventsCount
    console.log('\nTesting Analytics.getEventsCount()...');
    const count = await Analytics.getEventsCount();
    console.log(`Total events count: ${count}`);

    console.log('\n✅ Analytics endpoints test completed successfully');

  } catch (err) {
    console.error('❌ Error testing analytics endpoints:', err);
  }
}

testAnalyticsEndpoints();