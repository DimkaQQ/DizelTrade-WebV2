import os
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from ..deps import get_current_user

router = APIRouter()

# Uploads directory: project_root/uploads/
_UPLOADS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
)
os.makedirs(_UPLOADS_DIR, exist_ok=True)

_MAX_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/upload/ttn", status_code=201)
async def upload_ttn_photo(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a TTN photo (jpg/png/webp, max 10 MB). Returns the public URL."""
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") and content_type in _ALLOWED_CONTENT_TYPES):
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG and WebP images are allowed",
        )

    data = await file.read()
    if len(data) > _MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Build a safe filename
    original = os.path.basename(file.filename or "photo.jpg")
    filename = f"ttn_{int(time.time())}_{original}"
    dest = os.path.join(_UPLOADS_DIR, filename)

    with open(dest, "wb") as f:
        f.write(data)

    return {"url": f"/uploads/{filename}"}
