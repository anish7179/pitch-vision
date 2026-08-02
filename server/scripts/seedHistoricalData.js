import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiFootball from '../src/utils/apiFootball.js';
import HistoricalStanding from '../src/models/HistoricalStanding.js';
import HistoricalTeam from '../src/models/HistoricalTeam.js';
import HistoricalPlayer from '../src/models/HistoricalPlayer.js';

// Setup env variables for standalone script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI missing from .env');
  process.exit(1);
}

// ── Seed Targets ──────────────────────────────────────────────
const TARGET_SEASONS = [2023, 2024, 2025];
const TARGET_LEAGUES = [39, 140]; // Premier League, La Liga
const TARGET_TEAMS = [541, 529, 50, 42]; // Real Madrid, Barcelona, Man City, Arsenal
const TARGET_PLAYERS = [1100, 284, 278, 644, 1462]; // Haaland, Bellingham, Mbappé, Vini Jr, Saka

// Delay utility to prevent 429 Quota/Rate limits (1.5 seconds)
const delay = (ms = 1500) => new Promise(resolve => setTimeout(resolve, ms));

async function seedData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Seed Standings
    console.log('\n--- Seeding Standings ---');
    for (const season of TARGET_SEASONS) {
      for (const leagueId of TARGET_LEAGUES) {
        console.log(`Fetching standings for League ${leagueId}, Season ${season}...`);
        try {
          const res = await apiFootball.getStandings(leagueId, season);
          const standingsData = res.data?.response || [];
          
          if (standingsData.length > 0) {
            await HistoricalStanding.findOneAndUpdate(
              { leagueId, season },
              { $set: { standings: standingsData } },
              { upsert: true, new: true }
            );
            console.log(`✅ Saved standings for League ${leagueId}, Season ${season}`);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch standings for League ${leagueId}, Season ${season}:`, error.message);
        }
        await delay();
      }
    }

    // 2. Seed Teams
    console.log('\n--- Seeding Teams ---');
    for (const season of TARGET_SEASONS) {
      for (const teamId of TARGET_TEAMS) {
        console.log(`Fetching data for Team ${teamId}, Season ${season}...`);
        try {
          // Fetch team info
          const teamRes = await apiFootball.getTeamInfo(teamId);
          const teamInfo = teamRes.data?.response?.[0] || {};
          await delay();

          // Fetch squad
          const squadRes = await apiFootball.getSquad(teamId);
          const squad = squadRes.data?.response || [];
          await delay();

          // Fetch team statistics
          // Note: Team statistics require a leagueId. We'll use 39 for English teams, 140 for Spanish.
          const leagueId = (teamId === 50 || teamId === 42) ? 39 : 140;
          const statsRes = await apiFootball.client.get('/teams/statistics', {
            params: { team: teamId, league: leagueId, season }
          });
          const standings = statsRes.data?.response || {};
          await delay();
          
          // Fetch recent fixtures
          const fixturesRes = await apiFootball.getTeamFixtures(teamId, season, 10);
          const recentFixtures = fixturesRes.data?.response || [];
          await delay();

          await HistoricalTeam.findOneAndUpdate(
            { teamId, season },
            { 
              $set: { 
                teamInfo,
                squad,
                standings,
                recentFixtures
              } 
            },
            { upsert: true, new: true }
          );
          console.log(`✅ Saved data for Team ${teamId}, Season ${season}`);
        } catch (error) {
          console.error(`❌ Failed to fetch team data for Team ${teamId}, Season ${season}:`, error.message);
        }
      }
    }

    // 3. Seed Players
    console.log('\n--- Seeding Players ---');
    for (const season of TARGET_SEASONS) {
      for (const playerId of TARGET_PLAYERS) {
        console.log(`Fetching data for Player ${playerId}, Season ${season}...`);
        try {
          const statsRes = await apiFootball.getPlayerStats(playerId, season);
          const playerData = statsRes.data?.response?.[0] || null;
          await delay();

          let transfers = [];
          // Transfers don't require a season, so we only fetch once per player to save quota if we wanted, 
          // but we'll fetch it here and attach to all seasons for consistency.
          try {
            const transfersRes = await apiFootball.getTransfers(playerId);
            transfers = transfersRes.data?.response?.[0]?.transfers || [];
          } catch (tErr) {
            console.error(`  Warning: Failed to fetch transfers for player ${playerId}`);
          }
          await delay();

          if (playerData) {
            await HistoricalPlayer.findOneAndUpdate(
              { playerId, season },
              {
                $set: {
                  playerProfile: playerData.player,
                  statistics: playerData.statistics,
                  transfers: transfers
                }
              },
              { upsert: true, new: true }
            );
            console.log(`✅ Saved data for Player ${playerId}, Season ${season}`);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch player data for Player ${playerId}, Season ${season}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Historical data seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
}

seedData();
