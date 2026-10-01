from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class для всех ORM-моделей."""

    pass


# Импорты моделей нужны, чтобы Alembic их видел.
# Раскомментируем по мере создания моделей:
# from app.models.user import User
# from app.models.character import Character
