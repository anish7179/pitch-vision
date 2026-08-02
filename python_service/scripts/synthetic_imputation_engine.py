import pandas as pd
import numpy as np
import uuid
import math
import os
import time
from typing import List, Dict, Any

class SyntheticImputationEngine:
    """
    Context-Aware Synthetic Data Imputation Engine
    Generates physics-bound synthetic spatial events (passes, shots, goals) 
    that align with historical factual match outcomes.
    """
    def __init__(self, pitch_length: float = 120.0, pitch_width: float = 80.0):
        # StatsBomb standard pitch dimensions
        self.pitch_length = pitch_length
        self.pitch_width = pitch_width
        # Goal center is at the end of the pitch (X=120) and center of width (Y=40)
        self.goal_center = (pitch_length, pitch_width / 2.0)
        
    def calculate_xg(self, x: float, y: float) -> float:
        """
        Calculate Expected Goals (xG) based on distance and angle to the goal center.
        A heuristic model where xG decays with distance and poor angles.
        """
        # Distance from shot location to the center of the goal
        dist = math.sqrt((x - self.goal_center[0])**2 + (y - self.goal_center[1])**2)
        
        # Angle relative to the goal (0 radians = straight on)
        # Using abs(y - 40) ensures symmetry for angles left and right of the goal
        angle = math.atan2(abs(y - self.goal_center[1]), self.goal_center[0] - x)
        
        if dist == 0:
            return 0.99
            
        # Logistic-style decay: higher distance/angle exponentially reduces xG
        # math.exp(-0.15 * dist) punishes long shots
        # math.cos(angle) punishes wide shots
        xg_raw = math.exp(-0.15 * dist) * math.cos(angle)
        
        # Clamp xG between 0.01 and 0.99 for realism
        return round(min(max(xg_raw, 0.01), 0.99), 3)

    def _generate_passes(self, match_id: str, team_id: str, lineup: List[str], count: int, is_home: bool) -> List[Dict[str, Any]]:
        """
        Vectorized generation of pass events.
        """
        if count <= 0 or not lineup:
            return []
            
        # Randomly assign players to the passes
        player_ids = np.random.choice(lineup, count)
        
        # Generate start coordinates. 
        # Mean X is 60 (midfield), with a standard deviation to spread across the pitch.
        # Mean Y is 40 (center width), with a spread across the flanks.
        start_x = np.random.normal(loc=60.0, scale=20.0, size=count)
        start_y = np.random.normal(loc=40.0, scale=25.0, size=count)
        
        # Clip to pitch boundaries
        start_x = np.clip(start_x, 0.0, self.pitch_length)
        start_y = np.clip(start_y, 0.0, self.pitch_width)
        
        # Generate end coordinates (passes usually travel forward and to the sides)
        # Added np.random.normal to simulate varied pass distances
        end_x = start_x + np.random.normal(loc=8.0, scale=15.0, size=count)
        end_y = start_y + np.random.normal(loc=0.0, scale=15.0, size=count)
        
        # Clip end coordinates
        end_x = np.clip(end_x, 0.0, self.pitch_length)
        end_y = np.clip(end_y, 0.0, self.pitch_width)
        
        # Pre-generate UUIDs for performance
        event_ids = [str(uuid.uuid4()) for _ in range(count)]
        
        events = []
        for i in range(count):
            events.append({
                'event_id': event_ids[i],
                'match_id': match_id,
                'team_id': team_id,
                'player_id': player_ids[i],
                'event_type': 'Pass',
                'start_x': round(start_x[i], 2),
                'start_y': round(start_y[i], 2),
                'end_x': round(end_x[i], 2),
                'end_y': round(end_y[i], 2),
                'xg': None,
                'is_goal': False
            })
            
        return events

    def _generate_goals(self, match_id: str, team_id: str, lineup: List[str], count: int) -> List[Dict[str, Any]]:
        """
        Context-aware function to forcefully generate the exact number of real-world goals.
        """
        if count <= 0 or not lineup:
            return []
            
        player_ids = np.random.choice(lineup, count)
        
        # Goals strictly occur in the final third (X > 100) and within the width of the box (Y ~ 30-50)
        start_x = np.random.uniform(low=100.0, high=120.0, size=count)
        start_y = np.random.normal(loc=40.0, scale=8.0, size=count)
        start_y = np.clip(start_y, 30.0, 50.0)
        
        event_ids = [str(uuid.uuid4()) for _ in range(count)]
        events = []
        
        for i in range(count):
            x = start_x[i]
            y = start_y[i]
            # For confirmed goals, apply a floor of 0.7 xG to avoid nonsensical
            # near-zero values when the angle model breaks down at point-blank range
            xg = max(self.calculate_xg(x, y), 0.7)
            
            events.append({
                'event_id': event_ids[i],
                'match_id': match_id,
                'team_id': team_id,
                'player_id': player_ids[i],
                'event_type': 'Shot',
                'start_x': round(x, 2),
                'start_y': round(y, 2),
                'end_x': 120.0,  # Goal line
                'end_y': 40.0,   # Center of net
                'xg': xg,
                'is_goal': True
            })
            
        return events

    def _generate_shots(self, match_id: str, team_id: str, lineup: List[str], count: int) -> List[Dict[str, Any]]:
        """
        Generates non-goal shots with realistic physical constraints.
        """
        if count <= 0 or not lineup:
            return []
            
        player_ids = np.random.choice(lineup, count)
        
        # Shots happen in the attacking half, wider variance than goals
        start_x = np.random.normal(loc=105.0, scale=12.0, size=count)
        start_x = np.clip(start_x, 80.0, 120.0)
        
        start_y = np.random.normal(loc=40.0, scale=15.0, size=count)
        start_y = np.clip(start_y, 10.0, 70.0)
        
        event_ids = [str(uuid.uuid4()) for _ in range(count)]
        events = []
        
        for i in range(count):
            x = start_x[i]
            y = start_y[i]
            xg = self.calculate_xg(x, y)
            
            events.append({
                'event_id': event_ids[i],
                'match_id': match_id,
                'team_id': team_id,
                'player_id': player_ids[i],
                'event_type': 'Shot',
                'start_x': round(x, 2),
                'start_y': round(y, 2),
                'end_x': 120.0,
                'end_y': round(np.random.normal(40, 10), 2), # Misses the center of the net
                'xg': xg,
                'is_goal': False
            })
            
        return events

    def generate_match_events(self, match: Dict[str, Any]) -> pd.DataFrame:
        """
        Aggregates all synthetic spatial events for a single match.
        """
        match_id = match['match_id']
        events = []
        
        # 1. Generate Passes (400 - 650 per team for realism)
        home_passes_count = np.random.randint(400, 650)
        away_passes_count = np.random.randint(400, 650)
        events.extend(self._generate_passes(match_id, match['home_team_id'], match['home_lineup'], home_passes_count, is_home=True))
        events.extend(self._generate_passes(match_id, match['away_team_id'], match['away_lineup'], away_passes_count, is_home=False))
        
        # 2. Context-Aware Goals (Exact match to factual final score)
        events.extend(self._generate_goals(match_id, match['home_team_id'], match['home_lineup'], match['home_score']))
        events.extend(self._generate_goals(match_id, match['away_team_id'], match['away_lineup'], match['away_score']))
        
        # 3. Non-Goal Shots (5 to 15 per team)
        home_shots_count = max(0, np.random.randint(5, 15) - match['home_score'])
        away_shots_count = max(0, np.random.randint(5, 15) - match['away_score'])
        events.extend(self._generate_shots(match_id, match['home_team_id'], match['home_lineup'], home_shots_count))
        events.extend(self._generate_shots(match_id, match['away_team_id'], match['away_lineup'], away_shots_count))
        
        # Return as DataFrame for easy CSV serialization
        return pd.DataFrame(events)

    def run_batch_imputation(self, matches: List[Dict[str, Any]], output_path: str = 'synthetic_spatial_events.csv', chunk_size: int = 500):
        """
        Highly performant batch processing method. Iterates through thousands of matches,
        generating events and appending them to a CSV in chunks to prevent MemoryErrors.
        """
        start_time = time.time()
        total_events = 0
        is_first = True
        
        print(f"Starting Synthetic Data Imputation for {len(matches)} matches...")
        
        for i in range(0, len(matches), chunk_size):
            chunk_dfs = [self.generate_match_events(m) for m in matches[i:i+chunk_size]]
            batch_df = pd.concat(chunk_dfs, ignore_index=True)
            total_events += len(batch_df)
            
            batch_df.to_csv(output_path, mode='w' if is_first else 'a', header=is_first, index=False)
            is_first = False
            
            print(f"Processed {min(i+chunk_size, len(matches))}/{len(matches)} matches | Events: {total_events:,} | Elapsed: {round(time.time() - start_time, 2)}s")
            
        print(f"Imputation Complete! Saved {total_events:,} events to {output_path}")


# =====================================================================
# MOCK USAGE / ENTRY POINT
# =====================================================================
def generate_mock_factual_data(num_matches: int = 10) -> List[Dict[str, Any]]:
    """
    Generates dummy factual match records to feed into the engine.
    """
    matches = []
    for _ in range(num_matches):
        match_id = str(uuid.uuid4())[:8]
        home_lineup = [f"player_H_{i}" for i in range(11)]
        away_lineup = [f"player_A_{i}" for i in range(11)]
        
        matches.append({
            'match_id': match_id,
            'home_team_id': 'TEAM_HOME',
            'away_team_id': 'TEAM_AWAY',
            'home_score': np.random.randint(0, 4),
            'away_score': np.random.randint(0, 4),
            'home_lineup': home_lineup,
            'away_lineup': away_lineup
        })
    return matches

if __name__ == "__main__":
    # Create the target directory if it doesn't exist
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    
    # 1. Initialize Engine
    engine = SyntheticImputationEngine()
    
    # 2. Ingest Factual Data (Mocked here for demonstration)
    print("Loading factual historical data...")
    factual_matches = generate_mock_factual_data(num_matches=100) # Test with 100 matches
    
    # 3. Run Imputation
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'synthetic_spatial_events.csv')
    engine.run_batch_imputation(matches=factual_matches, output_path=output_file, chunk_size=20)
