"""Drive-sync value objects (Pydantic v2)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ConnectorCredentials(BaseModel):
    account_id: str
    user_id: str
    workspace_id: str
    provider: str = "gdrive"
    refresh_token: str
    access_token: str | None = None
    access_token_expires_at: datetime | None = None
    scopes: list[str] = Field(default_factory=list)


class DriveFile(BaseModel):
    id: str
    name: str
    mime_type: str
    modified_time: datetime
    size: int | None = None
    parents: list[str] = Field(default_factory=list)

    @property
    def is_folder(self) -> bool:
        return self.mime_type == "application/vnd.google-apps.folder"


class SyncItemResult(BaseModel):
    file_id: str
    name: str
    status: str  # synced | skipped | failed
    reason: str | None = None
    chunks_written: int = 0


class SyncReport(BaseModel):
    folder_id: str
    user_id: str
    workspace_id: str
    started_at: datetime
    finished_at: datetime | None = None
    scanned: int = 0
    synced: int = 0
    skipped: int = 0
    failed: int = 0
    watermark: datetime | None = None
    items: list[SyncItemResult] = Field(default_factory=list)
