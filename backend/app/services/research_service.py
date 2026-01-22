try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS
from app.core.logging import get_logger

logger = get_logger("research_service")

class ResearchService:
    
    def search_web(self, query: str, max_results: int = 1) -> str:
        """
        Performs a live web search to gather context.
        Returns a condensed string of facts.
        """
        logger.info(f"🔎 Oracle searching: {query}")
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                
            if not results:
                return "No live data found."
            
            # Format results for the AI context window
            context_text = "WEB SEARCH RESULTS:\n"
            for res in results:
                context_text += f"- {res['title']}: {res['body']}\n"
            
            return context_text
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return "Search unavailable (Grounding failed, proceeding with training data)."

    def enrich_variance_context(self, user_intent: str) -> str:
        """
        Extracts keywords and searches for tech trends/competitors.
        """
        # Simple extraction logic: search for constraints and stack trends
        search_query = f"{user_intent} technology stack compliance 2025"
        return self.search_web(search_query)
