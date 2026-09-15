import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()


DATABASE_ULR = os.getenv("DATABASE_URL")
if not DATABASE_ULR:
    raise RuntimeError("DATABASE_URL is not set.")

engine = create_engine(DATABASE_ULR)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()