"""
Constraint Service - The Moat / The Immune System
Traceability: Priority 5
Learns from past failures and warns about similar risks in new projects

This is "Magic Foresight" - the system remembers every mistake
and prevents you from making it again.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.models import ConstraintRegistry
from app.ai.embedding import get_embedding
from uuid import uuid4
from typing import List, Dict, Any, Optional


class ConstraintService:
    """
    The Learning System
    
    Capabilities:
    1. Learn from failures (ingest new constraints)
    2. Scan for risks (semantic search)
    3. Increment failure counters (track repeat mistakes)
    4. List all constraints (audit the moat)
    """
    
    def learn_constraint(
        self,
        db: Session,
        category: str,
        description: str,
        enforcement_rule: str,
        is_active: bool = True,
        status: Any = None, # Using Any to avoid circular import if needed, or just import it
        source_url: Optional[str] = None
    ) -> ConstraintRegistry:
        """
        The Learning Loop: Ingest a new lesson from a failure.
        
        This is how the system builds its immune system:
        - Project fails because MongoDB was used for banking → Learn constraint
        - Next time someone proposes MongoDB for finance → Warning triggered
        
        Args:
            db: Database session
            category: Constraint category (e.g., "Database", "Infrastructure", "Security")
            description: What went wrong (e.g., "MongoDB used for financial ledger")
            enforcement_rule: What to do instead (e.g., "Use PostgreSQL with ACID compliance")
            is_active: Whether this constraint is currently enforced
            
        Returns:
            The created ConstraintRegistry object
            
        Raises:
            ValueError: If embedding generation fails
            
        Example:
            >>> constraint = service.learn_constraint(
            ...     db,
            ...     category="Database",
            ...     description="App targets rural India with poor connectivity",
            ...     enforcement_rule="MUST implement Offline-First Sync (SQLite + WatermelonDB)"
            ... )
        """
        print(f"📚 Learning new constraint: {category}")
        print(f"   Description: {description[:100]}...")
        
        # 1. Vectorize the description (The Magic)
        # This converts human language into semantic coordinates
        vector = get_embedding(description)
        
        if not vector:
            raise ValueError("Failed to generate embedding for constraint. Is Ollama running?")
        
        # 2. Store in the Moat (Database)
        new_constraint = ConstraintRegistry(
            id=uuid4(),
            category=category,
            description=description,
            embedding=vector,  # PGVector handles the list->vector conversion
            enforcement_rule=enforcement_rule,
            failure_count=0,
            is_active=is_active,
            status=status if status else "ACTIVE",
            source_url=source_url
        )
        
        db.add(new_constraint)
        db.commit()
        db.refresh(new_constraint)
        
        print(f"✅ Constraint learned: {new_constraint.id}")
        return new_constraint
    
    def check_constraints(
        self,
        db: Session,
        context_input: str,
        threshold: float = 0.7,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        The Watchdog: Semantic Search for risks.
        
        This is the "Magic Foresight":
        - User says: "Building a fintech app for rural India"
        - System finds: "Rural India" constraint (offline-first required)
        - System finds: "Fintech" constraint (PostgreSQL required)
        - System warns BEFORE the project starts
        
        Args:
            db: Database session
            context_input: Project description or requirement
            threshold: Minimum similarity score (0-1) to trigger warning
            limit: Maximum number of warnings to return
            
        Returns:
            List of warnings with category, risk, enforcement, and relevance score
            
        Example:
            >>> warnings = service.check_constraints(
            ...     db,
            ...     "I want to build a video app for farmers in Bihar",
            ...     threshold=0.7
            ... )
            >>> for warning in warnings:
            ...     print(f"{warning['category']}: {warning['risk']}")
        """
        print(f"🔍 Scanning for risks in: {context_input[:100]}...")
        
        # 1. Vectorize the user's intent
        query_vector = get_embedding(context_input)
        
        if not query_vector:
            print("⚠️ Could not generate embedding for query")
            return []
        
        # 2. PGVector Semantic Search (Cosine Similarity)
        # The <=> operator calculates cosine distance (0 = identical, 2 = opposite)
        # We convert to similarity: 1 - distance = similarity
        sql = text("""
            SELECT 
                id, 
                category, 
                description, 
                enforcement_rule,
                failure_count,
                1 - (embedding <=> CAST(:vector AS vector)) as similarity
            FROM constraint_registry
            WHERE is_active = true
              AND 1 - (embedding <=> CAST(:vector AS vector)) > :threshold
            ORDER BY similarity DESC
            LIMIT :limit;
        """)
        
        # Convert vector to PostgreSQL array format
        vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"
        
        results = db.execute(
            sql,
            {
                "vector": vector_str,
                "threshold": threshold,
                "limit": limit
            }
        ).fetchall()
        
        # 3. Format Output
        warnings = []
        for row in results:
            warning = {
                "id": str(row.id),
                "category": row.category,
                "risk": row.description,
                "enforcement": row.enforcement_rule,
                "relevance": round(row.similarity, 2),
                "failure_count": row.failure_count
            }
            warnings.append(warning)
            print(f"   ⚠️ {row.category}: {row.description[:50]}... (relevance: {row.similarity:.2f})")
        
        if not warnings:
            print("   ✅ No risks detected")
        else:
            print(f"   🚨 Found {len(warnings)} potential risks")
        
        return warnings
    
    def increment_failure_count(
        self,
        db: Session,
        constraint_id: str
    ) -> Optional[ConstraintRegistry]:
        """
        Increment the failure counter for a constraint.
        
        This tracks how often we violate our own rules:
        - If failure_count is high → This is a common mistake
        - If failure_count is low → Rare edge case
        
        Args:
            db: Database session
            constraint_id: UUID of the constraint
            
        Returns:
            Updated constraint or None if not found
        """
        constraint = db.query(ConstraintRegistry).filter(
            ConstraintRegistry.id == constraint_id
        ).first()
        
        if not constraint:
            return None
        
        constraint.failure_count += 1
        db.commit()
        db.refresh(constraint)
        
        print(f"📊 Incremented failure count for {constraint.category}: {constraint.failure_count}")
        return constraint
    
    def list_all_constraints(
        self,
        db: Session,
        category: Optional[str] = None,
        active_only: bool = True
    ) -> List[ConstraintRegistry]:
        """
        List all constraints in the moat.
        
        Useful for:
        - Auditing what the system has learned
        - Reviewing constraint categories
        - Finding constraints to deactivate
        
        Args:
            db: Database session
            category: Filter by category (optional)
            active_only: Only return active constraints
            
        Returns:
            List of ConstraintRegistry objects
        """
        query = db.query(ConstraintRegistry)
        
        if active_only:
            query = query.filter(ConstraintRegistry.is_active == True)
        
        if category:
            query = query.filter(ConstraintRegistry.category == category)
        
        constraints = query.order_by(ConstraintRegistry.failure_count.desc()).all()
        
        print(f"📋 Found {len(constraints)} constraints")
        return constraints
    
    def deactivate_constraint(
        self,
        db: Session,
        constraint_id: str
    ) -> Optional[ConstraintRegistry]:
        """
        Deactivate a constraint (soft delete).
        
        Use this when:
        - A constraint is no longer relevant
        - Technology has changed
        - Rule was too strict
        
        Args:
            db: Database session
            constraint_id: UUID of the constraint
            
        Returns:
            Updated constraint or None if not found
        """
        constraint = db.query(ConstraintRegistry).filter(
            ConstraintRegistry.id == constraint_id
        ).first()
        
        if not constraint:
            return None
        
        constraint.is_active = False
        db.commit()
        db.refresh(constraint)
        
        print(f"🔕 Deactivated constraint: {constraint.category}")
        return constraint
    
    def get_constraint_stats(self, db: Session) -> Dict[str, Any]:
        """
        Get statistics about the constraint registry.
        
        Returns:
            Dictionary with stats (total, by category, top failures, etc.)
        """
        total = db.query(ConstraintRegistry).count()
        active = db.query(ConstraintRegistry).filter(
            ConstraintRegistry.is_active == True
        ).count()
        
        # Group by category
        category_counts = db.execute(text("""
            SELECT category, COUNT(*) as count
            FROM constraint_registry
            WHERE is_active = true
            GROUP BY category
            ORDER BY count DESC;
        """)).fetchall()
        
        # Top failures
        top_failures = db.query(ConstraintRegistry).filter(
            ConstraintRegistry.is_active == True
        ).order_by(
            ConstraintRegistry.failure_count.desc()
        ).limit(5).all()
        
        return {
            "total_constraints": total,
            "active_constraints": active,
            "inactive_constraints": total - active,
            "categories": {row.category: row.count for row in category_counts},
            "top_failures": [
                {
                    "category": c.category,
                    "description": c.description,
                    "failure_count": c.failure_count
                }
                for c in top_failures
            ]
        }
