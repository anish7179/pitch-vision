import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Mongoose schema for MatchEvent
const matchEventSchema = new mongoose.Schema({
  matchId: String,
  teamId: String,
  playerId: String,
  playerName: String,
  type: String,
  location: [Number],
  pass_end_location: [Number],
  xg: Number
});

const MatchEvent = mongoose.models.MatchEvent || mongoose.model('MatchEvent', matchEventSchema);

// Generate random coordinates mostly in the attacking half for Haaland
function generateEvents(playerId, playerName, count) {
  const events = [];
  for (let i = 0; i < count; i++) {
    // Pitch is 120 x 80. Attacking half is X: 60-120
    const x = 60 + Math.random() * 55; 
    const y = 10 + Math.random() * 60;
    
    events.push({
      matchId: "12345",
      teamId: "50",
      playerId: String(playerId),
      playerName: playerName,
      type: i % 3 === 0 ? 'Shot' : 'Pass',
      location: [x, y],
      pass_end_location: i % 3 === 0 ? null : [x + Math.random()*20, y + (Math.random()-0.5)*20],
      xg: i % 3 === 0 ? Math.random() * 0.3 : null
    });
  }
  return events;
}

async function seedMocks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Haaland
    await MatchEvent.deleteMany({ playerId: "1100" });
    await MatchEvent.insertMany(generateEvents(1100, "Erling Haaland", 150));
    
    // Bellingham
    await MatchEvent.deleteMany({ playerId: "284" });
    await MatchEvent.insertMany(generateEvents(284, "Jude Bellingham", 150));
    
    // Mbappe
    await MatchEvent.deleteMany({ playerId: "278" });
    await MatchEvent.insertMany(generateEvents(278, "Kylian Mbappé", 150));

    console.log("Mock spatial events seeded successfully for Haaland, Bellingham, and Mbappe.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedMocks();
