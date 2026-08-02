import SpatialEvent from '../models/SpatialEvent.js';

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC METADATA GENERATION
// ═══════════════════════════════════════════════════════════════
// The DB stores teams as 'TEAM_HOME' / 'TEAM_AWAY' and player_name
// is always null. We derive all display metadata deterministically
// from the match_id and player_id hashes so every reload is stable.

const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const TEAMS = [
  "Man City", "Arsenal", "Liverpool", "Real Madrid", "Barcelona",
  "Bayern Munich", "PSG", "Inter Milan", "Juventus", "AC Milan",
  "Chelsea", "Man United", "Tottenham", "Aston Villa", "Newcastle",
  "Bayer Leverkusen", "Dortmund", "Atletico Madrid", "Napoli"
];

// ═══════════════════════════════════════════════════════════════
// COORDINATED TEAM ROSTERS
// ═══════════════════════════════════════════════════════════════
// Each team has an 11-man roster in positional order:
// Index: 0=GK, 1=LB, 2=CB, 3=CB, 4=RB, 5=CM, 6=CDM, 7=CM, 8=LW, 9=ST, 10=RW
// This guarantees Haaland only appears for Man City, Saka only for Arsenal, etc.

const POSITIONS = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'LW', 'ST', 'RW'];

const teamRosters = {
  "Man City":          ["Ederson",     "Gvardiol",    "Dias",        "Akanji",      "Walker",      "De Bruyne",   "Rodri",       "Bernardo",    "Grealish",    "Haaland",     "Foden"],
  "Arsenal":           ["Raya",        "Zinchenko",   "Saliba",      "Gabriel",     "White",       "Odegaard",    "Rice",        "Havertz",     "Martinelli",  "Jesus",       "Saka"],
  "Liverpool":         ["Alisson",     "Robertson",   "Van Dijk",    "Konate",      "Alexander-Arnold", "Mac Allister", "Szoboszlai", "Gravenberch", "Diaz",   "Nunez",       "Salah"],
  "Real Madrid":       ["Courtois",    "Mendy",       "Rudiger",     "Militao",     "Carvajal",    "Modric",      "Tchouameni",  "Bellingham",  "Vinicius Jr", "Mbappe",     "Rodrygo"],
  "Barcelona":         ["ter Stegen",  "Balde",       "Araujo",      "Christensen", "Kounde",      "Pedri",       "de Jong",     "Gavi",        "Raphinha",    "Lewandowski", "Yamal"],
  "Bayern Munich":     ["Neuer",       "Davies",      "Upamecano",   "Kim",         "Kimmich",     "Musiala",     "Goretzka",    "Sane",        "Coman",       "Kane",        "Muller"],
  "PSG":               ["Donnarumma",  "Mendes",      "Marquinhos",  "Skriniar",    "Hakimi",      "Vitinha",     "Zaire-Emery", "Ruiz",        "Barcola",     "Kolo Muani",  "Dembele"],
  "Inter Milan":       ["Sommer",      "Dimarco",     "Bastoni",     "Acerbi",      "Dumfries",    "Barella",     "Calhanoglu",  "Mkhitaryan",  "Thuram",      "Lautaro",     "Pavard"],
  "Juventus":          ["Szczesny",    "Alex Sandro", "Bremer",      "Gatti",       "Danilo",      "Rabiot",      "Locatelli",   "McKennie",    "Chiesa",      "Vlahovic",    "Kostic"],
  "AC Milan":          ["Maignan",     "Hernandez",   "Tomori",      "Kjaer",       "Calabria",    "Bennacer",    "Tonali",      "Loftus-Cheek","Leao",        "Giroud",      "Pulisic"],
  "Chelsea":           ["Sanchez",     "Chilwell",    "Thiago Silva","Colwill",     "James",       "Enzo",        "Caicedo",     "Palmer",      "Sterling",    "Jackson",     "Mudryk"],
  "Man United":        ["Onana",       "Shaw",        "Varane",      "Martinez",    "Dalot",       "Bruno",       "Casemiro",    "Mount",       "Rashford",    "Hojlund",     "Garnacho"],
  "Tottenham":         ["Vicario",     "Udogie",      "Romero",      "Van de Ven",  "Porro",       "Maddison",    "Bissouma",    "Sarr",        "Son",         "Richarlison", "Kulusevski"],
  "Aston Villa":       ["Martinez",    "Digne",       "Torres",      "Konsa",       "Cash",        "McGinn",      "Tielemans",   "Douglas Luiz","Diaby",       "Watkins",     "Bailey"],
  "Newcastle":         ["Pope",        "Burn",        "Botman",      "Schar",       "Trippier",    "Joelinton",   "Guimaraes",   "Longstaff",   "Gordon",      "Isak",        "Almiron"],
  "Bayer Leverkusen":  ["Hradecky",    "Hincapie",    "Tah",         "Tapsoba",     "Frimpong",    "Wirtz",       "Xhaka",       "Andrich",     "Diaby",       "Schick",      "Adeyemi"],
  "Dortmund":          ["Kobel",       "Ryerson",     "Hummels",     "Schlotterbeck","Maatsen",    "Brandt",      "Can",         "Sabitzer",    "Sancho",      "Fullkrug",    "Adeyemi"],
  "Atletico Madrid":   ["Oblak",       "Reinildo",    "Savic",       "Hermoso",     "Molina",      "Koke",        "Llorente",    "De Paul",     "Griezmann",   "Morata",      "Correa"],
  "Napoli":            ["Meret",       "Mario Rui",   "Rrahmani",    "Kim",         "Di Lorenzo",  "Lobotka",     "Zielinski",   "Anguissa",    "Kvaratskhelia","Osimhen",    "Politano"],
};

const generateMatchMeta = (matchId) => {
  const hash = hashCode(matchId);
  const homeIdx = hash % TEAMS.length;
  const awayIdx = (homeIdx + 1 + (hash % (TEAMS.length - 1))) % TEAMS.length;

  const daysAgo = (hash % 30);
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() - daysAgo);
  const dateStr = dateObj.toISOString().split('T')[0];

  return {
    match_id: matchId,
    home_team: TEAMS[homeIdx],
    away_team: TEAMS[awayIdx],
    date: dateStr
  };
};

// Resolve a player_id like "player_H_4" into the correct name from
// that team's actual roster. Falls back gracefully if team not found.
const resolvePlayerName = (playerId, teamName) => {
  const parts = playerId.split('_');
  const idx = parseInt(parts[parts.length - 1], 10);
  if (isNaN(idx)) return playerId;

  const roster = teamRosters[teamName];
  if (roster && idx < roster.length) return roster[idx];
  return `Player #${idx + 1}`;
};

const resolvePlayerPosition = (playerId) => {
  const parts = playerId.split('_');
  const idx = parseInt(parts[parts.length - 1], 10);
  if (isNaN(idx) || idx >= POSITIONS.length) return 'SUB';
  return POSITIONS[idx];
};

// ═══════════════════════════════════════════════════════════════
// GET /api/spatial/matches
// Returns list of all matches with metadata
// ═══════════════════════════════════════════════════════════════
export const getMatches = async (req, res) => {
  try {
    const matchIds = await SpatialEvent.distinct('match_id');
    const matchesMeta = matchIds.map(generateMatchMeta);
    matchesMeta.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.status(200).json({ success: true, data: matchesMeta });
  } catch (error) {
    console.error('Error in getMatches:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching matches.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/spatial/match/:matchId/meta
// Full match metadata aggregated from raw spatial events
// ═══════════════════════════════════════════════════════════════
export const getMatchMeta = async (req, res) => {
  try {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ success: false, message: 'Missing match ID.' });

    const baseMeta = generateMatchMeta(matchId);
    const homeTeam = baseMeta.home_team;
    const awayTeam = baseMeta.away_team;

    // ── MongoDB Aggregation Pipeline ───────────────────────────
    // Single pass through all events to compute everything at once.
    const pipeline = [
      { $match: { match_id: matchId } },
      {
        $facet: {
          // Per-team totals
          teamStats: [
            {
              $group: {
                _id: '$team',
                totalEvents: { $sum: 1 },
                passes: { $sum: { $cond: [{ $eq: ['$event_type', 'Pass'] }, 1, 0] } },
                forwardPasses: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$event_type', 'Pass'] }, { $gt: ['$end_x', '$start_x'] }] },
                      1, 0
                    ]
                  }
                },
                shots: { $sum: { $cond: [{ $eq: ['$event_type', 'Shot'] }, 1, 0] } },
                totalXg: { $sum: { $cond: [{ $eq: ['$event_type', 'Shot'] }, { $ifNull: ['$xg', 0] }, 0] } },
              }
            }
          ],
          // All shot events (for timeline + goal synthesis)
          shotEvents: [
            { $match: { event_type: 'Shot' } },
            { $project: { event_id: 1, player_id: 1, team: 1, xg: 1, start_x: 1, start_y: 1 } },
            { $sort: { xg: -1 } } // highest xG first
          ],
          // Unique players per team
          players: [
            {
              $group: {
                _id: { team: '$team', player: '$player_id' },
                eventCount: { $sum: 1 }
              }
            },
            { $sort: { eventCount: -1 } }
          ]
        }
      }
    ];

    const [result] = await SpatialEvent.aggregate(pipeline);
    if (!result || result.teamStats.length === 0) {
      return res.status(404).json({ success: false, message: 'No events found for this match.' });
    }

    // ── Extract team stats ─────────────────────────────────────
    const homeStats = result.teamStats.find(t => t._id === 'TEAM_HOME') || { totalEvents: 0, passes: 0, forwardPasses: 0, shots: 0, totalXg: 0 };
    const awayStats = result.teamStats.find(t => t._id === 'TEAM_AWAY') || { totalEvents: 0, passes: 0, forwardPasses: 0, shots: 0, totalXg: 0 };

    const totalEvents = homeStats.totalEvents + awayStats.totalEvents || 1;
    const homePoss = Math.round((homeStats.totalEvents / totalEvents) * 100);
    const awayPoss = 100 - homePoss;

    const homePassAcc = homeStats.passes > 0 ? Math.round((homeStats.forwardPasses / homeStats.passes) * 100) : 0;
    const awayPassAcc = awayStats.passes > 0 ? Math.round((awayStats.forwardPasses / awayStats.passes) * 100) : 0;

    const pct = (a, b) => {
      const total = a + b || 1;
      return { aPct: Math.round((a / total) * 100), bPct: Math.round((b / total) * 100) };
    };

    const passPct = pct(homeStats.passes, awayStats.passes);
    const shotPct = pct(homeStats.shots, awayStats.shots);
    const xgPct = pct(homeStats.totalXg, awayStats.totalXg);
    const accPct = pct(homePassAcc, awayPassAcc);

    const stats = [
      { label: "Possession", home: `${homePoss}%`, away: `${awayPoss}%`, homePct: homePoss, awayPct: awayPoss },
      { label: "Total Passes", home: homeStats.passes, away: awayStats.passes, homePct: passPct.aPct, awayPct: passPct.bPct },
      { label: "Pass Accuracy", home: `${homePassAcc}%`, away: `${awayPassAcc}%`, homePct: accPct.aPct, awayPct: accPct.bPct },
      { label: "Shots", home: homeStats.shots, away: awayStats.shots, homePct: shotPct.aPct, awayPct: shotPct.bPct },
      { label: "Expected Goals (xG)", home: homeStats.totalXg.toFixed(2), away: awayStats.totalXg.toFixed(2), homePct: xgPct.aPct, awayPct: xgPct.bPct }
    ];

    // ── Synthesize Goals from high-xG Shots ────────────────────
    // Since is_goal is never set, treat shots with xg >= 0.20 as goals.
    // Cap at ~3 goals per team max for realism.
    const XG_GOAL_THRESHOLD = 0.20;
    let homeGoals = 0, awayGoals = 0;
    const timeline = [];

    const shotEvents = result.shotEvents || [];
    shotEvents.forEach(shot => {
      const isHome = shot.team === 'TEAM_HOME';
      const teamName = isHome ? homeTeam : awayTeam;
      const playerName = resolvePlayerName(shot.player_id, teamName);
      const minute = (hashCode(shot.event_id) % 90) + 1;

      if (shot.xg && shot.xg >= XG_GOAL_THRESHOLD && ((isHome && homeGoals < 3) || (!isHome && awayGoals < 3))) {
        if (isHome) homeGoals++; else awayGoals++;
        timeline.push({
          time: `${minute}'`,
          event: `Goal! (${teamName})`,
          type: isHome ? 'positive' : 'negative',
          desc: `${playerName} scores! (xG: ${shot.xg.toFixed(2)})`
        });
      } else if (shot.xg && shot.xg >= 0.05) {
        // Notable shot attempt
        timeline.push({
          time: `${minute}'`,
          event: `Shot (${teamName})`,
          type: 'neutral',
          desc: `${playerName} fires a shot. (xG: ${shot.xg.toFixed(2)})`
        });
      }
    });

    // Sort timeline by minute
    timeline.sort((a, b) => parseInt(a.time) - parseInt(b.time));

    // ── Build Lineups ──────────────────────────────────────────
    const GRID_POSITIONS = [
      "row-start-5 col-start-3", // GK  (idx 0)
      "row-start-4 col-start-1", // LB  (idx 1)
      "row-start-4 col-start-2", // CB  (idx 2)
      "row-start-4 col-start-4", // CB  (idx 3)
      "row-start-4 col-start-5", // RB  (idx 4)
      "row-start-3 col-start-2", // LCM (idx 5)
      "row-start-3 col-start-3", // CDM (idx 6)
      "row-start-3 col-start-4", // RCM (idx 7)
      "row-start-2 col-start-1", // LW  (idx 8)
      "row-start-2 col-start-3", // ST  (idx 9)
      "row-start-2 col-start-5"  // RW  (idx 10)
    ];

    const buildTeamLineup = (dbTeamToken, realTeamName) => {
      const teamPlayers = result.players
        .filter(p => p._id.team === dbTeamToken)
        .sort((a, b) => a._id.player.localeCompare(b._id.player));

      return teamPlayers.map((p, i) => {
        const playerId = p._id.player;
        const name = resolvePlayerName(playerId, realTeamName);
        const position = resolvePlayerPosition(playerId);
        const rating = 6.0 + (hashCode(playerId + matchId) % 35) / 10;

        return {
          id: playerId,
          name,
          team: realTeamName,
          position,
          rating,
          num: i + 1,
          gridPosition: i < 11 ? GRID_POSITIONS[i] : null,
          isBench: i >= 11,
          isSubbedOn: false,
          isSubbedOff: false,
          eventCount: p.eventCount
        };
      });
    };

    const lineups = {
      home: buildTeamLineup('TEAM_HOME', homeTeam),
      away: buildTeamLineup('TEAM_AWAY', awayTeam)
    };

    return res.status(200).json({
      success: true,
      data: {
        ...baseMeta,
        home_team: homeTeam,
        away_team: awayTeam,
        score: { home: homeGoals, away: awayGoals },
        stats,
        timeline,
        lineups
      }
    });
  } catch (error) {
    console.error('Error in getMatchMeta:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching match metadata.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/spatial/match/:matchId
// Raw spatial events for canvas rendering
// ═══════════════════════════════════════════════════════════════
export const getMatchSpatialEvents = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { eventType, team } = req.query;

    if (!matchId || matchId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing match ID.' });
    }

    const baseMeta = generateMatchMeta(matchId);
    const query = { match_id: matchId };

    // Map UI team names back to DB tokens for the query
    if (eventType) query.event_type = eventType;
    if (team) {
      if (team === baseMeta.home_team) query.team = 'TEAM_HOME';
      else if (team === baseMeta.away_team) query.team = 'TEAM_AWAY';
      else query.team = team;
    }

    const events = await SpatialEvent.find(query)
      .select('start_x start_y end_x end_y xg event_type team player_id -_id')
      .lean();

    if (!events.length) {
      // Return empty array instead of 404 so the frontend doesn't enter error state
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Map DB team tokens to real UI team names
    const mappedEvents = events.map(e => ({
      ...e,
      team: e.team === 'TEAM_HOME' ? baseMeta.home_team : (e.team === 'TEAM_AWAY' ? baseMeta.away_team : e.team)
    }));

    return res.status(200).json({
      success: true,
      count: mappedEvents.length,
      data: mappedEvents
    });
  } catch (error) {
    console.error('Error in getMatchSpatialEvents:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching match spatial data.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/spatial/player/:playerId
// Player-specific spatial events across all matches
// ═══════════════════════════════════════════════════════════════
export const getPlayerSpatialEvents = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season } = req.query;

    if (!playerId || playerId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing player ID.' });
    }

    const query = { player_id: playerId };
    if (season) query.season = season;

    const events = await SpatialEvent.find(query)
      .select('start_x start_y end_x end_y xg event_type match_id -_id')
      .lean();

    if (!events.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error in getPlayerSpatialEvents:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching player spatial data.' });
  }
};
