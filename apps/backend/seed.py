import asyncio
import httpx
from app.db.session import engine, Base
from app.models.speaker import Speaker

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    speakers = [
        Speaker(id="spk_001", manufacturer="KEF", model="LS50 Meta", type="bookshelf", sensitivity=87.0),
        Speaker(id="spk_002", manufacturer="Sonus Faber", model="Olympica Nova I", type="bookshelf", sensitivity=87.0),
        Speaker(id="spk_003", manufacturer="Bowers & Wilkins", model="805 D4", type="standmount", sensitivity=88.0),
        Speaker(id="spk_004", manufacturer="KEF", model="LS60", type="floorstanding", sensitivity=92.0),
        Speaker(id="spk_005", manufacturer="Sonus Faber", model="Aida", type="floorstanding", sensitivity=92.0),
    ]

    async with engine.begin() as conn:
        for speaker in speakers:
            await conn.execute(Speaker.__table__.insert().values(
                id=speaker.id,
                manufacturer=speaker.manufacturer,
                model=speaker.model,
                type=speaker.type,
                sensitivity=speaker.sensitivity,
            ))

    print("Database seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
