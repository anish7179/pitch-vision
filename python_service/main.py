import os
import io
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
from mplsoccer import Pitch
import seaborn as sns
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Use Agg backend for matplotlib to prevent GUI errors in server environment
matplotlib.use('Agg')

# Load environment variables from the server directory
server_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../server/.env'))
load_dotenv(server_env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI missing. Ensure it is defined in ../server/.env")

app = FastAPI(title="PitchVision Heatmap Engine", version="1.0.0")

# Map API-Football ID -> StatsBomb ID
PLAYER_ID_MAP = {
    "278": "3009",  # Kylian Mbappé
    "154": "5503",  # Lionel Messi
}
# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Client
db_client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global db_client, db
    print("Connecting to MongoDB...")
    db_client = AsyncIOMotorClient(MONGODB_URI)
    
    # We need to extract the database name from the URI. 
    # If the URI doesn't explicitly contain one at the end, PyMongo uses 'test'.
    # For a robust approach, we get the default database.
    db = db_client.get_default_database()
    print("Connected to MongoDB.")

@app.on_event("shutdown")
async def shutdown_db_client():
    global db_client
    if db_client:
        print("Disconnecting from MongoDB...")
        db_client.close()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Python Heatmap Engine"}

@app.get("/api/heatmap/{match_id}/{player_id}")
async def generate_heatmap(match_id: str, player_id: str):
    """
    Fetches spatial events from MongoDB and returns a generated football pitch heatmap image.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized.")

    try:
        m_id_int = int(match_id)
    except ValueError:
        m_id_int = match_id

    # Translate the ID, default to the original if not found
    statsbomb_player_id = PLAYER_ID_MAP.get(str(player_id), str(player_id))

    try:
        p_id_int = int(statsbomb_player_id)
    except ValueError:
        p_id_int = statsbomb_player_id

    # 1. Query MongoDB for spatial events
    # We query the `matchevents` collection created by our Node ETL script.
    cursor = db.matchevents.find({
        "matchId": {"$in": [match_id, str(match_id), m_id_int]},
        "playerId": {"$in": [statsbomb_player_id, str(statsbomb_player_id), p_id_int]},
        "location": {"$exists": True, "$ne": None}
    })
    
    events = await cursor.to_list(length=1000)
    
    if not events:
        raise HTTPException(
            status_code=404, 
            detail=f"No spatial events found for match {match_id} and player {player_id}"
        )

    # 2. Extract Coordinates
    # StatsBomb pitch coordinates are [x, y]. Length is 120, width is 80.
    x_coords = []
    y_coords = []
    
    for event in events:
        loc = event.get("location")
        if loc and len(loc) >= 2:
            x_coords.append(loc[0])
            y_coords.append(loc[1])

    if not x_coords:
        raise HTTPException(status_code=404, detail="No valid coordinates extracted from events.")

    # Convert to DataFrame
    df = pd.DataFrame({"x": x_coords, "y": y_coords})

    # 3. Render Heatmap with mplsoccer
    # Configure Pitch
    # StatsBomb uses a 120x80 pitch
    pitch = Pitch(pitch_type='statsbomb', pitch_color='#1e1e1e', line_color='#c7d5cc')
    
    # Create Figure
    fig, ax = pitch.draw(figsize=(10, 7))
    fig.set_facecolor('#1e1e1e')

    if len(df) < 5:
        # Fallback to scatter plot if KDE fails (e.g. too few points to calculate density)
        pitch.scatter(df.x, df.y, ax=ax, c='red', s=100, zorder=2)
    else:
        try:
            # Draw KDE Heatmap
            kde = pitch.kdeplot(
                df.x,
                df.y,
                ax=ax,
                fill=True,
                levels=100,
                thresh=0,
                cut=4,
                cmap='magma' # magma gives a nice glowing hot look on dark backgrounds
            )
        except Exception as e:
            print(f"KDE Plot failed: {e}")
            pitch.scatter(df.x, df.y, ax=ax, c='red', s=100, zorder=2)

    # Clean up the figure borders
    plt.tight_layout()

    # 4. Export to in-memory bytes
    buf = io.BytesIO()
    fig.savefig(buf, format='png', facecolor=fig.get_facecolor(), bbox_inches='tight', dpi=150)
    buf.seek(0)
    
    # Close the matplotlib figure to free memory
    plt.close(fig)

    # 5. Return StreamingResponse
    return StreamingResponse(buf, media_type="image/png")

@app.get("/api/xgmap/{match_id}/{player_id}")
async def generate_xgmap(match_id: str, player_id: str):
    """
    Fetches shot events from MongoDB and returns an xG scatter plot.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized.")

    try:
        m_id_int = int(match_id)
    except ValueError:
        m_id_int = match_id

    # Translate the ID, default to the original if not found
    statsbomb_player_id = PLAYER_ID_MAP.get(str(player_id), str(player_id))

    try:
        p_id_int = int(statsbomb_player_id)
    except ValueError:
        p_id_int = statsbomb_player_id

    cursor = db.matchevents.find({
        "matchId": {"$in": [match_id, str(match_id), m_id_int]},
        "playerId": {"$in": [statsbomb_player_id, str(statsbomb_player_id), p_id_int]},
        "type": "Shot",
        "location": {"$exists": True, "$ne": None}
    })
    
    events = await cursor.to_list(length=1000)
    
    # Configure Pitch
    pitch = Pitch(pitch_type='statsbomb', pitch_color='#1e1e1e', line_color='#c7d5cc')
    fig, ax = pitch.draw(figsize=(10, 7))
    fig.set_facecolor('#1e1e1e')
    
    if not events:
        ax.text(60, 40, 'No Shots Recorded', color='white', ha='center', va='center', fontsize=20, alpha=0.5)
    else:
        x_coords = []
        y_coords = []
        xg_vals = []
        
        for event in events:
            loc = event.get("location")
            if loc and len(loc) >= 2:
                x_coords.append(loc[0])
                y_coords.append(loc[1])
                xg = event.get("xg")
                xg_vals.append(xg if xg is not None else 0.05) # fallback xG

        if x_coords:
            df = pd.DataFrame({"x": x_coords, "y": y_coords, "xg": xg_vals})
            # Scale dot size based on xG (max xG ~ 1.0, so mult by 1000 for size)
            sizes = df.xg * 1000
            
            pitch.scatter(df.x, df.y, ax=ax, s=sizes, c=df.xg, cmap='autumn', edgecolors='white', linewidth=1.5, alpha=0.8, zorder=2)
        else:
            ax.text(60, 40, 'No Valid Shot Coordinates', color='white', ha='center', va='center', fontsize=20, alpha=0.5)

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', facecolor=fig.get_facecolor(), bbox_inches='tight', dpi=150)
    buf.seek(0)
    plt.close(fig)
    return StreamingResponse(buf, media_type="image/png")

@app.get("/api/passnetwork/{match_id}/{player_id}")
async def generate_passnetwork(match_id: str, player_id: str):
    """
    Fetches pass events from MongoDB and returns a pass network map (arrows).
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized.")

    try:
        m_id_int = int(match_id)
    except ValueError:
        m_id_int = match_id

    # Translate the ID, default to the original if not found
    statsbomb_player_id = PLAYER_ID_MAP.get(str(player_id), str(player_id))

    try:
        p_id_int = int(statsbomb_player_id)
    except ValueError:
        p_id_int = statsbomb_player_id

    cursor = db.matchevents.find({
        "matchId": {"$in": [match_id, str(match_id), m_id_int]},
        "playerId": {"$in": [statsbomb_player_id, str(statsbomb_player_id), p_id_int]},
        "type": "Pass",
        "location": {"$exists": True, "$ne": None},
        "pass_end_location": {"$exists": True, "$ne": None}
    })
    
    events = await cursor.to_list(length=1000)
    
    # Configure Pitch
    pitch = Pitch(pitch_type='statsbomb', pitch_color='#1e1e1e', line_color='#c7d5cc')
    fig, ax = pitch.draw(figsize=(10, 7))
    fig.set_facecolor('#1e1e1e')
    
    if not events:
        ax.text(60, 40, 'No Passes Recorded', color='white', ha='center', va='center', fontsize=20, alpha=0.5)
    else:
        x_start, y_start, x_end, y_end = [], [], [], []
        
        for event in events:
            loc = event.get("location")
            end_loc = event.get("pass_end_location")
            if loc and len(loc) >= 2 and end_loc and len(end_loc) >= 2:
                x_start.append(loc[0])
                y_start.append(loc[1])
                x_end.append(end_loc[0])
                y_end.append(end_loc[1])

        if x_start:
            # Draw arrows
            pitch.arrows(x_start, y_start, x_end, y_end, ax=ax, width=2, headwidth=4, headlength=4, color='#3498db', alpha=0.5, zorder=2)
            # Scatter start locations
            pitch.scatter(x_start, y_start, ax=ax, color='#3498db', s=30, alpha=0.8, zorder=3)
        else:
            ax.text(60, 40, 'No Valid Pass Coordinates', color='white', ha='center', va='center', fontsize=20, alpha=0.5)

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', facecolor=fig.get_facecolor(), bbox_inches='tight', dpi=150)
    buf.seek(0)
    plt.close(fig)
    return StreamingResponse(buf, media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
