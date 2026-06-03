# models/connector.py
# A configured integration that pulls data from a Source platform.
# Each Connector belongs to one Source and has its own credentials + sync status.
#
# CREDENTIAL DESIGN
# -----------------
# We never store actual secrets in the database. Instead we store two fields:
#
#   credential_store  →  WHERE the real secret lives
#   credential_ref    →  HOW to look it up (env var name, secret ARN, vault path…)
#
# In dev/CI:   credential_store=mock,      credential_ref="mock://twitter-dev"
# In staging:  credential_store=env_var,   credential_ref="CAMPUSSPHERE_TWITTER_BEARER"
# In prod:     credential_store=secrets_manager,
#              credential_ref="arn:aws:ssm:us-east-1:123:parameter/cs/prod/twitter"
#
# The actual resolution logic lives in services/credential_service.py.

import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CredentialStore(str, enum.Enum):
    mock = "mock"                          # safe placeholder for dev/CI
    env_var = "env_var"                    # read from os.environ at runtime
    secrets_manager = "secrets_manager"    # AWS SSM / Secrets Manager / GCP Secret Manager
    vault = "vault"                        # HashiCorp Vault


class ConnectorStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    error = "error"


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"))
    status: Mapped[ConnectorStatus] = mapped_column(
        SAEnum(ConnectorStatus), default=ConnectorStatus.active
    )
    credential_store: Mapped[CredentialStore] = mapped_column(
        SAEnum(CredentialStore), default=CredentialStore.mock
    )
    # Reference only — never the actual secret value.
    credential_ref: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
