import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HistoricalPlayer from './src/models/HistoricalPlayer.js';

dotenv.config();

const mockPlayer = {
  playerId: 1100, // Erling Haaland
  season: 2024,
  playerProfile: {
    id: 1100,
    name: "Erling Haaland",
    firstname: "Erling",
    lastname: "Haaland",
    age: 24,
    birth: { date: "2000-07-21", place: "Leeds", country: "England" },
    nationality: "Norway",
    height: "195 cm",
    weight: "88 kg",
    injured: false,
    photo: "https://media.api-sports.io/football/players/1100.png"
  },
  statistics: [
    {
      team: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", season: 2024 },
      games: { appearences: 35, lineups: 34, minutes: 3000, number: 9, position: "Attacker", rating: "8.1" },
      goals: { total: 36, conceded: 0, assists: 8, saves: null },
      shots: { total: 115, on: 65 },
      passes: { total: 400, key: 30, accuracy: 75 },
      tackles: { total: 10, blocks: 2, interceptions: 5 },
      duels: { total: 150, won: 75 },
      dribbles: { attempts: 40, success: 20, past: null },
      fouls: { drawn: 30, committed: 20 },
      cards: { yellow: 3, yellowred: 0, red: 0 },
      penalty: { won: null, commited: null, scored: 7, missed: 1, saved: null }
    }
  ],
  transfers: [
    {
      date: "2022-07-01",
      type: "€ 60M",
      teams: {
        in: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        out: { id: 165, name: "Borussia Dortmund", logo: "https://media.api-sports.io/football/teams/165.png" }
      }
    }
  ]
};

async function seedMocks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    await HistoricalPlayer.deleteMany({ playerId: 1100, season: 2024 });
    await HistoricalPlayer.create(mockPlayer);

    console.log("Mock player (Haaland) seeded successfully.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedMocks();
