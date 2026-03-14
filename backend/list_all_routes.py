import sys
import os
sys.path.append(os.getcwd())
from api.main import app

for route in app.routes:
    if hasattr(route, "path"):
        print(f"{route.path} -> {route.name}")
