import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATA_DIR = path.join(__dirname, '..', 'data', 'transfermarkt');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.csv');
const APPEARANCES_FILE = path.join(DATA_DIR, 'appearances.csv');

// Define Schema dynamically for bulk insert without strict schema
const TransfermarktSchema = new mongoose.Schema({
  type: String, // 'player' or 'appearance'
  data: mongoose.Schema.Types.Mixed
}, { strict: false });

const HistoricalTransfermarkt = mongoose.model('HistoricalTransfermarkt', TransfermarktSchema, 'historical_transfermarkt');

async function processCSV(filePath, type) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`[!] File not found: ${filePath}`);
      return resolve(0);
    }

    console.log(`Processing ${filePath}...`);
    const results = [];
    let processedCount = 0;
    const CHUNK_SIZE = 2000;

    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push({ type, data });
        if (results.length >= CHUNK_SIZE) {
          stream.pause();
          HistoricalTransfermarkt.insertMany(results.splice(0, results.length))
            .then(() => {
              processedCount += CHUNK_SIZE;
              console.log(`Inserted ${processedCount} ${type} records...`);
              stream.resume();
            })
            .catch(err => {
              stream.destroy(err);
            });
        }
      })
      .on('end', async () => {
        if (results.length > 0) {
          await HistoricalTransfermarkt.insertMany(results);
          processedCount += results.length;
        }
        console.log(`Finished processing ${type}. Total: ${processedCount}`);
        resolve(processedCount);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Clearing existing historical_transfermarkt collection...');
    await HistoricalTransfermarkt.deleteMany({});
    
    let total = 0;
    total += await processCSV(PLAYERS_FILE, 'player');
    total += await processCSV(APPEARANCES_FILE, 'appearance');

    console.log(`Transfermarkt Seeding Complete! Total records inserted: ${total}`);
  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.connection.close();
  }
}

run();
