"""
The Silent Listener - Ingestion Service
Traceability: Priority 1
"""
from typing import List, Optional
from pydantic import BaseModel
import random

class IngestionService:
    """
    The Silent Listener - Ingestion Service
    Analyzes project descriptions and extracts semantic keywords and maturity.
    """
    
    def process_input(self, input_text: str):
        """
        Process user input and extract features.
        In a full implementation, this would use the AI Engine (Llama/Ollama).
        For now, we'll use a rule-based engine + random maturity increments.
        """
        text = input_text.lower()
        keywords = []
        
        # Rule-based keyword extraction (The "Silent Listener" magic)
        features = {
            "crm": ["crm", "customer", "lead", "sales"],
            "mobile": ["mobile", "app", "ios", "android", "phone"],
            "rural": ["rural", "offline", "field", "village", "connection"],
            "billing": ["billing", "payment", "invoice", "money", "gst"],
            "auth": ["login", "signup", "auth", "secure", "password"],
            "dashboard": ["chart", "analytics", "dashboard", "report"]
        }
        
        for feature, tags in features.items():
            if any(tag in text for tag in tags):
                keywords.append(feature.upper())
        
        # Simulate Maturity Score (0-100)
        # Each meaningful input increases maturity
        increment = 10 if keywords else 2
        
        # Response logic
        if not keywords:
            response_text = "Noted. Tell me more about the specific features or constraints."
        else:
            response_text = f"I've mapped the following components: {', '.join(keywords)}. What else?"

        return {
            "response_text": response_text,
            "detected_keywords": keywords,
            "maturity_score_increment": increment
        }
