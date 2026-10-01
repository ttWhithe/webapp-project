"""Assembly point for Alembic: imports Base and every model.

Alembic uses `Base.metadata` to auto-generate migrations. Every model MUST
be imported here (directly or transitively), otherwise it won't be picked up.
"""

from app.db.base_class import Base
from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.user import User
from app.models.weapon import Weapon

__all__ = ["ArtifactSet", "Base", "Character", "User", "Weapon"]
