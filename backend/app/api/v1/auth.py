"""Auth endpoints: register, login, refresh, logout."""

from typing import Annotated

from app.api.deps import CurrentUser, get_auth_service, get_refresh_service, get_user_repo
from app.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from app.core.security import create_access_token
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserLogin, UserRead
from app.services.auth import (
    AuthService,
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
)
from app.services.refresh_token import RefreshTokenService, extract_user_id
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    response: Response,
    auth: Annotated[AuthService, Depends(get_auth_service)],
    refresh_svc: Annotated[RefreshTokenService, Depends(get_refresh_service)],
) -> UserRead:
    """Create a new user and log them in (set auth cookies)."""
    try:
        user = await auth.register(
            email=payload.email,
            username=payload.username,
            password=payload.password,
        )
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None
    except UsernameAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        ) from None

    access = create_access_token(subject=str(user.id), role=user.role.value)
    refresh = await refresh_svc.issue(user.id)
    set_auth_cookies(response, access_token=access, refresh_token=refresh)
    return UserRead.model_validate(user)


@router.post("/login", response_model=UserRead)
async def login(
    payload: UserLogin,
    response: Response,
    auth: Annotated[AuthService, Depends(get_auth_service)],
    refresh_svc: Annotated[RefreshTokenService, Depends(get_refresh_service)],
) -> UserRead:
    """Authenticate by email + password, set auth cookies."""
    user = await auth.authenticate(email=payload.email, password=payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access = create_access_token(subject=str(user.id), role=user.role.value)
    refresh = await refresh_svc.issue(user.id)
    set_auth_cookies(response, access_token=access, refresh_token=refresh)
    return UserRead.model_validate(user)


@router.post("/refresh", response_model=UserRead)
async def refresh(
    request: Request,
    response: Response,
    refresh_svc: Annotated[RefreshTokenService, Depends(get_refresh_service)],
    repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> UserRead:
    """Rotate the refresh token and issue a new access token.

    Does not require a valid access token — that's the whole point: access
    is expired, we exchange the refresh for a fresh pair.
    """
    old_token = request.cookies.get(REFRESH_COOKIE)
    if not old_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    user_id = extract_user_id(old_token)
    if user_id is None:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed refresh token",
        )

    user = await repo.get_by_id(user_id)
    if user is None:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_refresh = await refresh_svc.rotate(user_id, old_token)
    if new_refresh is None:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    new_access = create_access_token(subject=str(user.id), role=user.role.value)
    set_auth_cookies(response, access_token=new_access, refresh_token=new_refresh)
    return UserRead.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    current_user: CurrentUser,
    refresh_svc: Annotated[RefreshTokenService, Depends(get_refresh_service)],
) -> None:
    """Revoke the current refresh token and clear auth cookies."""
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if refresh_token:
        await refresh_svc.revoke(current_user.id, refresh_token)
    clear_auth_cookies(response)
