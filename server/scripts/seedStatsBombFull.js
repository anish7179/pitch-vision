import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import MatchEvent from '../src/models/MatchEvent.js';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATA_DIR = path.join(__dirname, '..', 'data', 'open-data', 'open-data-master', 'data');
const MATCHES_FILE = path.join(DATA_DIR, 'matches', '43', '106.json');
const EVENTS_DIR = path.join(DATA_DIR, 'events');

async function seedStatsBombFull() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    console.log('Clearing existing MatchEvents collection to maintain idempotency...');
    await MatchEvent.deleteMany({});
    console.log('MatchEvents collection cleared.');

    console.log(`Reading matches from ${MATCHES_FILE}...`);
    const matchesData = await fs.readFile(MATCHES_FILE, 'utf-8');
    const matches = JSON.parse(matchesData);
    
    console.log(`Found ${matches.length} matches for FIFA World Cup 2022.`);

    let matchCount = 1;

    for (const match of matches) {
      const matchId = match.match_id.toString();
      const eventsFile = path.join(EVENTS_DIR, `${matchId}.json`);
      
      try {
        const eventsData = await fs.readFile(eventsFile, 'utf-8');
        const events = JSON.parse(eventsData);
        
        const spatialEvents = [];

        for (const event of events) {
          if (!event.location) continue; // Only keep spatial events
          
          let pass_end_location = null;
          if (event.type.name === 'Pass' && event.pass && event.pass.end_location) {
            pass_end_location = event.pass.end_location;
          } else if (event.type.name === 'Carry' && event.carry && event.carry.end_location) {
            pass_end_location = event.carry.end_location;
          }

          let xg = null;
          if (event.type.name === 'Shot' && event.shot && event.shot.statsbomb_xg) {
            xg = event.shot.statsbomb_xg;
          }
          
          // Player info might not exist for some events (e.g. half-time, substitutions sometimes)
          // But spatial events usually have players.
          const playerId = event.player ? event.player.id.toString() : null;
          const playerName = event.player ? event.player.name : null;
          const teamId = event.team ? event.team.id.toString() : null;

          if (!playerId) continue; // Skip events without a player

          spatialEvents.push({
            matchId: matchId,
            teamId: teamId,
            playerId: playerId,
            playerName: playerName,
            type: event.type.name,
            location: event.location,
            pass_end_location: pass_end_location,
            xg: xg
          });
        }

        if (spatialEvents.length > 0) {
          await MatchEvent.insertMany(spatialEvents);
        }

        console.log(`Match ${matchCount}/${matches.length} (ID: ${matchId}): Inserted ${spatialEvents.length} spatial events.`);
      } catch (err) {
        console.error(`Error processing match ${matchId}:`, err.message);
      }
      
      matchCount++;
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

seedStatsBombFull();
