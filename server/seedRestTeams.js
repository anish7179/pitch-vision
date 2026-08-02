import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HistoricalTeam from './src/models/HistoricalTeam.js';

dotenv.config();

const teams = [
  {
    teamId: 541,
    season: 2024,
    teamInfo: { id: 541, name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
    squad: [{ players: [] }],
    standings: [],
    recentFixtures: []
  },
  {
    teamId: 50,
    season: 2024,
    teamInfo: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
    squad: [{ players: [] }],
    standings: [],
    recentFixtures: []
  },
  {
    teamId: 42,
    season: 2024,
    teamInfo: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
    squad: [{ players: [] }],
    standings: [],
    recentFixtures: []
  }
];

async function seedMocks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    for (const t of teams) {
      await HistoricalTeam.deleteMany({ teamId: t.teamId, season: t.season });
      await HistoricalTeam.create(t);
    }

    console.log("Mock teams seeded successfully.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedMocks();
