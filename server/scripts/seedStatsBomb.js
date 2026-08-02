import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import MatchEvent from '../src/models/MatchEvent.js';

// Setup env variables for standalone script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const EVENTS_DIR = path.join(__dirname, '../data/events');

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI missing from .env');
  process.exit(1);
}

/**
 * Reads a local StatsBomb JSON file and bulk inserts the mapped events into MongoDB.
 */
async function seedStatsBomb() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // Ensure directory exists
    if (!fs.existsSync(EVENTS_DIR)) {
      console.warn(`⚠️ Events directory not found: ${EVENTS_DIR}`);
      console.warn('⚠️ Please create the directory and place StatsBomb JSON files inside.');
      process.exit(0);
    }

    const files = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      console.warn(`⚠️ No JSON files found in ${EVENTS_DIR}. Place StatsBomb data there to ingest.`);
      process.exit(0);
    }

    console.log(`\n--- Starting Ingestion Pipeline for ${files.length} match(es) ---`);

    for (const file of files) {
      const matchId = path.basename(file, '.json');
      const filePath = path.join(EVENTS_DIR, file);
      
      console.log(`\n📄 Parsing match ${matchId} (${file})...`);
      
      let rawData;
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        rawData = JSON.parse(fileContent);
      } catch (err) {
        console.error(`❌ Error reading or parsing ${file}:`, err.message);
        continue;
      }

      if (!Array.isArray(rawData)) {
        console.error(`❌ Expected JSON array in ${file}, skipping.`);
        continue;
      }

      const mappedEvents = [];
      let skippedCount = 0;

      // Iterate through the massive JSON array
      for (const event of rawData) {
        // Skip events without a location (like Starting XI or substitutions, unless explicitly needed)
        // For spatial KDE heatmaps, location is critical
        if (!event.location || !Array.isArray(event.location)) {
          skippedCount++;
          continue;
        }

        // Map relevant fields
        const mappedEvent = {
          matchId: matchId.toString(),
          teamId: event.team?.id?.toString(),
          playerId: event.player?.id?.toString(),
          playerName: event.player?.name,
          type: event.type?.name || 'Unknown',
          location: event.location,
          pass_end_location: event.pass?.end_location,
          xg: event.shot?.statsbomb_xg,
          rawEvent: event,
        };

        mappedEvents.push(mappedEvent);
      }

      console.log(`   - Parsed ${mappedEvents.length} spatial events (Skipped ${skippedCount} non-spatial events).`);

      if (mappedEvents.length > 0) {
        // Clear existing events for this match to ensure idempotency
        await MatchEvent.deleteMany({ matchId: matchId.toString() });
        
        // Execute bulk load
        const result = await MatchEvent.insertMany(mappedEvents, { ordered: false });
        console.log(`✅ Successfully bulk-inserted ${result.length} events for match ${matchId}.`);
      } else {
        console.log(`⚠️ No valid spatial events found for match ${matchId}.`);
      }
    }

    console.log('\n🎉 StatsBomb data ingestion pipeline complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error during pipeline execution:', error);
    process.exit(1);
  }
}

seedStatsBomb();
