"""Image validation and storage. Bytes are decoded and re-encoded, never stored as uploaded."""

import io
import uuid
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
FULL_EDGE = 1440
THUMB_EDGE = 640
Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard


class InvalidImage(ValueError):
    pass


@dataclass
class StoredImage:
    object_key: str
    thumb_key: str
    width: int
    height: int


def _root() -> Path:
    return get_settings().media_root


def _encode(img: Image.Image, edge: int) -> bytes:
    copy = img.copy()
    copy.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    copy.save(buf, "WEBP", quality=85, method=4)  # WEBP save drops EXIF/GPS metadata
    return buf.getvalue()


def process_image(data: bytes) -> tuple[bytes, bytes, int, int]:
    """Validate actual content (not filename/MIME) and return (full, thumb, w, h)."""
    try:
        with Image.open(io.BytesIO(data)) as probe:
            if probe.format not in ALLOWED_FORMATS:
                raise InvalidImage("Unsupported image format. Use JPEG, PNG, WebP or GIF.")
            probe.verify()
        with Image.open(io.BytesIO(data)) as src:
            img = ImageOps.exif_transpose(src).convert("RGB")
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError) as e:
        raise InvalidImage("File is not a valid image.") from e
    full = _encode(img, FULL_EDGE)
    thumb = _encode(img, THUMB_EDGE)
    with Image.open(io.BytesIO(full)) as out:
        w, h = out.size
    return full, thumb, w, h


def save_post_image(post_id: uuid.UUID, data: bytes) -> StoredImage:
    full, thumb, w, h = process_image(data)
    stem = f"posts/{post_id}/{uuid.uuid4()}"
    keys = (f"{stem}.webp", f"{stem}_thumb.webp")
    for key, blob in zip(keys, (full, thumb), strict=True):
        path = _root() / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(blob)
    return StoredImage(keys[0], keys[1], w, h)


def object_path(key: str) -> Path:
    path = (_root() / key).resolve()
    if not path.is_relative_to(_root().resolve()):
        raise FileNotFoundError(key)
    return path


def delete_objects(keys: list[str]) -> None:
    for key in keys:
        object_path(key).unlink(missing_ok=True)
