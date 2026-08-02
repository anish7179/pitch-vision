import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('../server/.env')

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    db = client.get_default_database()
    count = await db.matchevents.count_documents({
        'matchId': '3869685',
        'playerId': '3009',
        'type': 'Shot'
    })
    print('Shots (str):', count)

    count_int = await db.matchevents.count_documents({
        'matchId': 3869685,
        'playerId': 3009,
        'type': 'Shot'
    })
    print('Shots (int):', count_int)

asyncio.run(run())
