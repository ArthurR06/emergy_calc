from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ProcessCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(default="general", min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=500)


class ProcessUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(default="general", min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=500)


class FlowBase(BaseModel):
    flow_name: str = Field(min_length=2, max_length=120)
    amount: float = Field(ge=0)
    unit: str = Field(min_length=1, max_length=20)
    resource_type: str
    uev: float = Field(ge=0)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("resource_type")
    @classmethod
    def validate_resource_type(cls, value: str) -> str:
        value = value.upper()
        if value not in {"R", "N", "F"}:
            raise ValueError("resource_type deve ser 'R', 'N' ou 'F'")
        return value


class FlowCreate(FlowBase):
    process_id: int


class FlowUpdate(FlowBase):
    pass
