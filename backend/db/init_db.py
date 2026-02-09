from db.database import engine, Base
from db import models


def init_db():
    """
    Initialize database tables using SQLAlchemy ORM.
    Safe to run multiple times.
    """
    Base.metadata.create_all(bind=engine)
