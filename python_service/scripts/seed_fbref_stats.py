import os
import sys
import soccerdata as sd
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

# Load MONGODB_URI from server/.env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'server', '.env'))
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    print("RuntimeError: MONGODB_URI missing.")
    sys.exit(1)

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_default_database()
collection = db['historical_fbref']

def main():
    try:
        # Idempotent execution
        print("Clearing historical_fbref collection...")
        collection.delete_many({})

        leagues = ["ENG-Premier League", "ESP-La Liga", "GER-Bundesliga", "ITA-Serie A", "FRA-Ligue 1"]
        seasons = ["1617", "1718", "1819", "1920", "2021", "2122", "2223", "2324", "2425", "2526"]
        
        print(f"Fetching FBref standard stats for {len(leagues)} leagues across {len(seasons)} seasons...")
        
        # Initialize soccerdata FBref scraper
        fbref = sd.FBref(leagues=leagues, seasons=seasons)
        
        # Extract standard stats
        print("Reading player season stats (this may take a while)...")
        df = fbref.read_player_season_stats(stat_type="standard")
        
        print("Processing DataFrame...")
        # Reset MultiIndex to convert index levels (league, season, team, player) into columns
        df = df.reset_index()
        
        # Handle NaN values for BSON compatibility
        # MongoDB cannot store NaN or NaT, we replace them with None (which becomes null in JSON/BSON)
        # However, df.where(pd.notnull(df), None) can sometimes fail with MultiIndex columns (soccerdata uses MultiIndex columns)
        # So we flatten the column names first if they are MultiIndex
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ['_'.join([str(c) for c in col if str(c) != '']).strip('_') for col in df.columns]

        df = df.where(pd.notnull(df), None)
        
        # Convert DataFrame to list of dictionaries
        records = df.to_dict(orient='records')
        
        if records:
            print(f"Inserting {len(records)} records into MongoDB...")
            # Insert in chunks of 2000
            chunk_size = 2000
            inserted = 0
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i + chunk_size]
                collection.insert_many(chunk)
                inserted += len(chunk)
                print(f"Inserted {inserted} / {len(records)} records")
                
            print("FBref Seeding Complete!")
        else:
            print("No records fetched.")
            
    except Exception as e:
        print(f"Fatal Error during FBref seeding: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
