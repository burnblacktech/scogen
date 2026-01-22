
import requests
import json

try:
    response = requests.get("http://localhost:11434/api/tags")
    print(f"Status: {response.status_code}")
    print(f"Tags: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error connecting to Ollama API: {e}")
