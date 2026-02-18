import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

try:
    print("Attempting to import api.routes.chat_routes...")
    from api.routes import chat_routes
    print("Import SUCCESS")
except Exception as e:
    print(f"Import FAILED: {e}")
    import traceback
    traceback.print_exc()
