from pydantic import BaseModel
from backend.app.schemas.user import UserCreate
from backend.app.schemas.business import BusinessCreate

class OwnerRegisterCreate(BaseModel):
    user: UserCreate
    business: BusinessCreate