import mongoose from 'mongoose';

const conn = await mongoose.connect('mongodb://127.0.0.1:27017/pitchvision');
const db = conn.connection.db;
const col = db.collection('spatialevents');

// Focused queries for data I need
const samples = await col.find({}).limit(3).toArray();
console.log('=== 3 SAMPLE DOCS ===');
samples.forEach((s, i) => console.log(`Doc${i}:`, JSON.stringify(s)));

const eventTypes = await col.distinct('event_type');
console.log('\nEVENT_TYPES:', eventTypes);

const goals = await col.countDocuments({ is_goal: true });
console.log('GOALS:', goals);

const withXg = await col.countDocuments({ xg: { $ne: null, $gt: 0 } });
console.log('WITH_XG:', withXg);

const total = await col.countDocuments();
console.log('TOTAL:', total);

const matchIds = await col.distinct('match_id');
console.log('MATCH_COUNT:', matchIds.length);

// Check a single match event distribution
const sampleMatch = matchIds[0];
const perType = await col.aggregate([
  { $match: { match_id: sampleMatch } },
  { $group: { _id: '$event_type', count: { $sum: 1 } } }
]).toArray();
console.log(`\nMATCH ${sampleMatch} EVENT BREAKDOWN:`, perType);

const shotsInMatch = await col.find({ match_id: sampleMatch, event_type: 'Shot' }).limit(3).toArray();
console.log('SHOT SAMPLES:', shotsInMatch.map(s => JSON.stringify(s)));

process.exit(0);
