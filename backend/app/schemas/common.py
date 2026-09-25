from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class TimestampedSchema(BaseSchema):
    created_at: datetime
    updated_at: Optional[datetime] = None
