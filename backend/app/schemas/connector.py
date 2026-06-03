# schemas/connector.py
# Note: credential_ref is a safe reference (env var name, secret path, etc.)
# — it is never the actual secret value, so it is safe to include in API responses.

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.connector import CredentialStore, ConnectorStatus


class ConnectorCreate(BaseModel):
    name: str
    source_id: int
    credential_store: CredentialStore = CredentialStore.mock
    credential_ref: Optional[str] = None


class ConnectorResponse(BaseModel):
    id: int
    name: str
    source_id: int
    status: ConnectorStatus
    credential_store: CredentialStore
    credential_ref: Optional[str]   # reference only — never the resolved secret
    last_synced_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectorUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[ConnectorStatus] = None
    credential_store: Optional[CredentialStore] = None
    credential_ref: Optional[str] = None
