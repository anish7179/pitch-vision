import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HistoricalPlayer from './src/models/HistoricalPlayer.js';

dotenv.config();

const players = [
  {
    playerId: 284,
    season: 2024,
    playerProfile: {
      id: 284, name: "Jude Bellingham", firstname: "Jude", lastname: "Bellingham",
      age: 21, nationality: "England", height: "186 cm", weight: "75 kg",
      photo: "https://media.api-sports.io/football/players/284.png"
    },
    statistics: [{ team: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }, league: { name: "La Liga" }, games: { appearences: 32, position: "Midfielder" }, goals: { total: 19, assists: 6 } }]
  },
  {
    playerId: 278,
    season: 2024,
    playerProfile: {
      id: 278, name: "Kylian Mbappé", firstname: "Kylian", lastname: "Mbappé",
      age: 25, nationality: "France", height: "178 cm", weight: "73 kg",
      photo: "https://media.api-sports.io/football/players/278.png"
    },
    statistics: [{ team: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }, league: { name: "La Liga" }, games: { appearences: 28, position: "Attacker" }, goals: { total: 27, assists: 7 } }]
  },
  {
    playerId: 644,
    season: 2024,
    playerProfile: {
      id: 644, name: "Vinícius Júnior", firstname: "Vinícius", lastname: "Júnior",
      age: 24, nationality: "Brazil", height: "176 cm", weight: "73 kg",
      photo: "https://media.api-sports.io/football/players/644.png"
    },
    statistics: [{ team: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }, league: { name: "La Liga" }, games: { appearences: 30, position: "Attacker" }, goals: { total: 20, assists: 11 } }]
  },
  {
    playerId: 1462,
    season: 2024,
    playerProfile: {
      id: 1462, name: "Bukayo Saka", firstname: "Bukayo", lastname: "Saka",
      age: 23, nationality: "England", height: "178 cm", weight: "72 kg",
      photo: "https://media.api-sports.io/football/players/1462.png"
    },
    statistics: [{ team: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" }, league: { name: "Premier League" }, games: { appearences: 35, position: "Attacker" }, goals: { total: 16, assists: 9 } }]
  }
];

async function seedMocks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    for (const p of players) {
      await HistoricalPlayer.deleteMany({ playerId: p.playerId, season: p.season });
      await HistoricalPlayer.create(p);
    }

    console.log("Mock players seeded successfully.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedMocks();
