import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Database Connection
const MONGO_URI = 'mongodb://localhost:27017/pitchvision';

// 2. Import the canonical SpatialEvent model (single source of truth for schema + indexes)
import SpatialEvent from '../src/models/SpatialEvent.js';

async function seedDatabase() {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 3. Initialization
    // Clear the existing spatialevents collection to prevent duplicates on re-runs.
    console.log('Clearing existing spatial events...');
    await SpatialEvent.deleteMany({});
    console.log('Collection cleared.');

    // Path to the synthetic events CSV created by the Python engine
    const csvFilePath = path.resolve(__dirname, '../../python_service/scripts/synthetic_spatial_events.csv');
    console.log(`Reading CSV from ${csvFilePath}`);

    let batch = [];
    let totalInserted = 0;
    const BATCH_SIZE = 5000;

    // Helper: parse a numeric string safely, preserving 0.0 as a valid value
    const safeParseFloat = (val) => {
      if (val === '' || val === undefined || val === null) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    // 4. Stream Processing
    const readStream = fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        // Map raw CSV headers into our strictly defined Schema format
        const eventData = {
          event_id: row.event_id,
          match_id: row.match_id,
          player_id: row.player_id,
          player_name: row.player_name || null,
          team: row.team_id || row.team, 
          event_type: row.event_type || row.type, 
          
          // Parse numeric strings into floats (safe: preserves 0.0)
          start_x: safeParseFloat(row.start_x),
          start_y: safeParseFloat(row.start_y),
          end_x: safeParseFloat(row.end_x),
          end_y: safeParseFloat(row.end_y),
          xg: safeParseFloat(row.xg),
          
          // Map is_goal from Python's "True"/"False" string
          is_goal: row.is_goal === 'True'
        };

        batch.push(eventData);

        // 5. Batch Insertion
        if (batch.length >= BATCH_SIZE) {
          // Pause the stream to stop reading into memory while we insert
          readStream.pause();
          
          try {
            await SpatialEvent.insertMany(batch);
            totalInserted += batch.length;
            console.log(`💾 Inserted ${totalInserted} events...`);
            
            // Empty the array to free up V8 heap RAM
            batch = [];
            
            // Resume the stream to read the next chunk
            readStream.resume();
          } catch (insertError) {
            console.error('❌ Error inserting batch:', insertError);
            readStream.destroy();
          }
        }
      })
      .on('end', async () => {
        // 6. Edge Cases
        // Ensure any remaining records in the array are inserted after the stream naturally ends.
        if (batch.length > 0) {
          try {
            await SpatialEvent.insertMany(batch);
            totalInserted += batch.length;
          } catch (insertError) {
            console.error('❌ Error inserting final batch:', insertError);
          }
        }
        
        console.log(`🎉 Success! Total spatial events inserted: ${totalInserted}`);
        console.log('🔌 Disconnecting from MongoDB...');
        await mongoose.disconnect();
      })
      .on('error', (err) => {
        console.error('❌ Error reading CSV stream:', err);
        mongoose.disconnect();
      });

  } catch (error) {
    console.error('❌ Initialization Error:', error);
    process.exit(1);
  }
}

// Execute the seeder script
seedDatabase();
