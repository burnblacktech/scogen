from app.core.config import settings
import requests
import json

class IdeaService:
    
    def generate_venture_memo(self, user_idea: str):
        """
        Expands a simple user idea into a structured Venture Memo.
        """
        prompt = f"""
        You are a top-tier VC Analyst. Convert this raw idea into a structured Investment Memo.
        
        Raw Idea: "{user_idea}"
        
        Structure:
        1. Executive Summary
        2. Market Opportunity
        3. Business Model
        4. Go-to-Market Strategy
        5. Risks & Mitigations
        
        Output format: Text (Markdown compatible). Keep it concise but professional.
        """
        
        try:
             # Using the existing Ollama configuration
            payload = {
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            }
            
            # Using settings.OLLAMA_HOST as established in HealthService check
            url = f"{settings.OLLAMA_HOST}/api/generate"
            
            res = requests.post(url, json=payload, timeout=30)
            
            if res.status_code == 200:
                response_text = res.json().get("response", "")
                return {
                    "doc_id": "temp_id",
                    "title": f"Venture Memo: {user_idea[:30]}...",
                    "preview": response_text
                }
            else:
                return {
                    "doc_id": "error",
                    "title": "Generation Failed",
                    "preview": "Could not connect to Neural Core."
                }
                
        except Exception as e:
            print(f"Idea Generation Error: {e}")
            return {
                "doc_id": "error",
                "title": "System Error",
                "preview": "The Neural Core is offline."
            }
