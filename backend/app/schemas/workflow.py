from pydantic import BaseModel, Field
from typing import List, Optional

class Transition(BaseModel):
    trigger: str = Field(..., description="Action that causes the move (e.g. 'Payment Success')")
    from_state: str
    to_state: str
    required_fields: List[str] = Field(default=[], description="Data required to move (e.g. 'Transaction ID')")
    side_effects: List[str] = Field(default=[], description="Actions triggered (e.g. 'Send Email', 'Decrement Stock')")

class StateMachine(BaseModel):
    entity_name: str = Field(..., description="Which Entity this applies to (e.g. 'Order')")
    initial_state: str
    states: List[str]
    transitions: List[Transition]

class DomainWorkflow(BaseModel):
    domain: str
    workflows: List[StateMachine]
