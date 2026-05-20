from fastapi import HTTPException, status

from backend.app.models.user import User

def validate_user_access(current_user: User, resource_owner_id: int) -> None:
    if current_user.id != resource_owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed",
        )