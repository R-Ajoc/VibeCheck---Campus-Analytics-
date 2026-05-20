import sqlite3
from pathlib import Path

path = Path(__file__).resolve().parents[3] / "vibeCheck.db"
print("db path:", path)
print("exists:", path.exists())
conn = sqlite3.connect(path)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
print(cur.fetchall())
conn.close()
