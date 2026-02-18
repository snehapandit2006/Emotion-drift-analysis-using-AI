"""
Medical Log Feature — Pytest Tests
Tests CRUD operations, doctor access, new fields (notes/frequency), and adherence endpoint.
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ---------------------
# Test DB Setup — must happen BEFORE importing the app
# to prevent production DB being created
# ---------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_medical.db"

# Remove old test DB to ensure fresh schema
if os.path.exists("test_medical.db"):
    os.remove("test_medical.db")

test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Now import app and deps
from db.database import Base
from db.models import User, MedicalEntry

# Create all tables with current schema
Base.metadata.create_all(bind=test_engine)

from api.main import app
from api.deps import get_current_user
from api.deps import get_db as deps_get_db
from db.database import get_db as db_get_db

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Mock users
mock_patient = User(id=1, email="test@example.com", role="patient")
mock_doctor = User(id=2, email="doctor@example.com", role="psychiatrist")

def override_get_patient():
    return mock_patient

def override_get_doctor():
    return mock_doctor

# Override BOTH get_db references so all routes use test DB
app.dependency_overrides[deps_get_db] = override_get_db
app.dependency_overrides[db_get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_patient

client = TestClient(app)

# ---------------------
# Fixtures
# ---------------------
@pytest.fixture(autouse=True)
def clean_tables():
    """Clear data from medical_entries before each test."""
    with test_engine.connect() as conn:
        conn.execute(text("DELETE FROM medical_entries"))
        conn.commit()
    
    # Default: patient user
    app.dependency_overrides[get_current_user] = override_get_patient
    yield

@pytest.fixture
def created_log():
    """Create a log entry and return its data."""
    response = client.post("/medical/logs", json={
        "medicine": "Aspirin",
        "dosage": "100mg",
        "time": "08:00 AM",
        "taken": False,
        "notes": "Take after breakfast",
        "frequency": "daily"
    })
    assert response.status_code == 200
    return response.json()

# ---------------------
# CRUD Tests
# ---------------------
class TestCreateLog:
    def test_create_basic(self):
        response = client.post("/medical/logs", json={
            "medicine": "Aspirin",
            "dosage": "100mg",
            "time": "08:00 AM",
            "taken": False
        })
        assert response.status_code == 200
        data = response.json()
        assert data["medicine"] == "Aspirin"
        assert data["id"] is not None

    def test_create_with_notes_and_frequency(self):
        response = client.post("/medical/logs", json={
            "medicine": "Metformin",
            "dosage": "500mg",
            "time": "09:00 AM",
            "taken": False,
            "notes": "Take with food",
            "frequency": "twice_daily"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Take with food"
        assert data["frequency"] == "twice_daily"

    def test_create_defaults(self):
        """notes should default to None and frequency to 'daily'"""
        response = client.post("/medical/logs", json={
            "medicine": "VitaminD",
            "dosage": "1000IU",
            "time": "07:00 AM",
            "taken": False
        })
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] is None
        assert data["frequency"] == "daily"


class TestGetLogs:
    def test_get_logs(self, created_log):
        response = client.get("/medical/logs")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert data[0]["id"] == created_log["id"]


class TestUpdateLog:
    def test_update_taken(self, created_log):
        log_id = created_log["id"]
        response = client.put(f"/medical/logs/{log_id}", json={
            "medicine": "Aspirin",
            "dosage": "100mg",
            "time": "08:00 AM",
            "taken": True,
            "notes": "Took with water",
            "frequency": "daily"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["taken"] is True
        assert data["notes"] == "Took with water"

    def test_update_nonexistent(self):
        response = client.put("/medical/logs/9999", json={
            "medicine": "X",
            "dosage": "Y",
            "time": "Z",
            "taken": False
        })
        assert response.status_code == 404


class TestDeleteLog:
    def test_delete(self, created_log):
        log_id = created_log["id"]
        response = client.delete(f"/medical/logs/{log_id}")
        assert response.status_code == 200

        # Verify deleted
        response = client.get("/medical/logs")
        ids = [l["id"] for l in response.json()]
        assert log_id not in ids

    def test_delete_nonexistent(self):
        response = client.delete("/medical/logs/9999")
        assert response.status_code == 404


# ---------------------
# Doctor Access Tests
# ---------------------
class TestDoctorAccess:
    def test_doctor_view_patient_logs(self, created_log):
        # Set up doctor-patient relationship in test DB
        db = TestingSessionLocal()
        u = db.query(User).filter(User.id == 1).first()
        if not u:
            u = User(id=1, email="test@example.com", role="patient", doctor_id=2)
            db.add(u)
        else:
            u.doctor_id = 2

        d = db.query(User).filter(User.id == 2).first()
        if not d:
            d = User(id=2, email="doctor@example.com", role="psychiatrist")
            db.add(d)
        db.commit()
        db.close()

        # Switch to doctor
        app.dependency_overrides[get_current_user] = override_get_doctor

        response = client.get("/medical/patient/1/logs")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert data[0]["id"] == created_log["id"]


# ---------------------
# Adherence Endpoint Tests
# ---------------------
class TestAdherence:
    def test_adherence_own_data(self):
        # Create multiple entries
        for i, taken in enumerate([True, True, False, True]):
            client.post("/medical/logs", json={
                "medicine": "TestMed",
                "dosage": "10mg",
                "time": f"0{i+6}:00 AM",
                "taken": taken
            })

        response = client.get("/medical/adherence/1", params={"days": 7})
        assert response.status_code == 200
        data = response.json()
        assert data["total_entries"] == 4
        assert data["taken"] == 3
        assert data["adherence_rate"] == 75.0
        assert len(data["breakdown"]) == 1
        assert data["breakdown"][0]["medicine"] == "TestMed"

    def test_adherence_empty(self):
        response = client.get("/medical/adherence/1", params={"days": 7})
        assert response.status_code == 200
        data = response.json()
        assert data["total_entries"] == 0
        assert data["adherence_rate"] == 0.0
