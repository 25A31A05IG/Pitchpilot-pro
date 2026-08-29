import os
import jwt
import datetime
import bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
JWT_SECRET = os.getenv("JWT_SECRET", "default_secret")
ALGORITHM = "HS256"

client = MongoClient(MONGO_URI)
db = client["pitchpilot_db"]
users_col = db["users"]
pitches_col = db["pitches"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None

def create_user(email: str, password: str):
    if users_col.find_one({"email": email}):
        return None
    hashed = hash_password(password)
    res = users_col.insert_one({"email": email, "password": hashed, "created_at": datetime.datetime.utcnow()})
    return str(res.inserted_id)

def get_user(email: str):
    return users_col.find_one({"email": email})

def save_pitch(user_email: str, repo_url: str, pitch_data: dict) -> str:
    doc = {
        "user_email": user_email,
        "repo_url": repo_url,
        "pitch": pitch_data,
        "created_at": datetime.datetime.utcnow()
    }
    res = pitches_col.insert_one(doc)
    return str(res.inserted_id)

def get_user_pitches(user_email: str):
    return list(pitches_col.find({"user_email": user_email}, {"_id": 0}))