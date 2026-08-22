"""Deterministic intake checks for KneeCo's future MRI model adapter.

This module intentionally performs only non-diagnostic preprocessing. It can
decode a supported image or the first page of a PDF, calculate technical image
quality signals, and determine whether the file can be handed to a validated
model. It never infers anatomy, OA status, millimetre measurements, or an
implant recommendation without a validated model and calibration source.
"""

from __future__ import annotations

import base64
import hashlib
import io
import math
from dataclasses import dataclass
from typing import Literal

from PIL import Image, ImageStat, UnidentifiedImageError
from pypdf import PdfReader
from pdf2image import convert_from_bytes


SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png"}
SUPPORTED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}
SUPPORTED_PDF_TYPE = "application/pdf"
MAX_INPUT_BYTES = 20 * 1024 * 1024


@dataclass(frozen=True)
class DecodedStudy:
    image: Image.Image
    input_kind: Literal["image", "pdf"]
    page_count: int | None
    file_sha256: str


def decode_base64(value: str) -> bytes:
    try:
        decoded = base64.b64decode(value, validate=True)
    except Exception as exc:  # pragma: no cover - message is the contract
        raise ValueError("The upload is not valid base64 content.") from exc
    if not decoded:
        raise ValueError("The upload is empty.")
    if len(decoded) > MAX_INPUT_BYTES:
        raise ValueError("The upload exceeds the 20 MB intake limit.")
    return decoded


def decode_study(*, file_name: str, content_type: str, content_base64: str) -> DecodedStudy:
    payload = decode_base64(content_base64)
    normalized_type = content_type.lower().split(";", 1)[0].strip()
    suffix = file_name.lower().rsplit(".", 1)[-1] if "." in file_name else ""
    is_pdf = normalized_type == SUPPORTED_PDF_TYPE or suffix == "pdf"
    is_image = normalized_type in SUPPORTED_IMAGE_TYPES or f".{suffix}" in SUPPORTED_IMAGE_SUFFIXES

    if not is_pdf and not is_image:
        raise ValueError("Supported input formats are JPG, JPEG, PNG, and PDF.")

    digest = hashlib.sha256(payload).hexdigest()
    if is_pdf:
        try:
            page_count = len(PdfReader(io.BytesIO(payload)).pages)
            if page_count < 1:
                raise ValueError("The PDF does not contain any pages.")
            first_page = convert_from_bytes(payload, first_page=1, last_page=1, fmt="png", dpi=160)[0]
        except Exception as exc:  # pragma: no cover - converter errors vary by platform
            raise ValueError("The PDF could not be rendered for review.") from exc
        return DecodedStudy(image=first_page.convert("L"), input_kind="pdf", page_count=page_count, file_sha256=digest)

    try:
        image = Image.open(io.BytesIO(payload))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The image file could not be decoded.") from exc
    return DecodedStudy(image=image.convert("L"), input_kind="image", page_count=None, file_sha256=digest)


def inspect_image(image: Image.Image) -> dict[str, float | int | bool | list[str]]:
    width, height = image.size
    stat = ImageStat.Stat(image)
    mean = float(stat.mean[0])
    variance = float(stat.var[0])
    contrast = math.sqrt(max(variance, 0.0))
    reasons: list[str] = []
    if width < 512 or height < 512:
        reasons.append("Image resolution is below the 512 px review threshold.")
    if contrast < 12:
        reasons.append("Image contrast is too low for reliable visual review.")
    return {
        "width_px": width,
        "height_px": height,
        "mean_intensity": round(mean, 2),
        "contrast_stddev": round(contrast, 2),
        "passes_technical_review": not reasons,
        "review_reasons": reasons,
    }


def rank_by_dimension_distance(patient: dict[str, float], catalogue: list[dict[str, float | str]]) -> list[dict[str, float | int | str]]:
    """Rank a clinician-provided catalogue by engineering dimensional proximity.

    This is not a surgical or implant recommendation. All supplied dimensions
    must already have been clinically verified with physical spacing.
    """

    dimension_keys = ("femoral_width_mm", "femoral_ap_mm", "tibial_width_mm", "tibial_ap_mm")
    ranked: list[dict[str, float | int | str]] = []
    for item in catalogue:
        normalized_squared_error = 0.0
        for key in dimension_keys:
            reference = max(float(patient[key]), 1.0)
            normalized_delta = (float(item[key]) - float(patient[key])) / reference
            normalized_squared_error += normalized_delta * normalized_delta
        rms_error = math.sqrt(normalized_squared_error / len(dimension_keys))
        proximity_score = max(0.0, round((1.0 - rms_error) * 100.0, 1))
        ranked.append({
            "manufacturer": str(item["manufacturer"]),
            "system": str(item["system"]),
            "size": str(item["size"]),
            "dimensional_proximity_score": proximity_score,
            "normalized_rms_error": round(rms_error, 4),
        })
    return sorted(ranked, key=lambda item: float(item["normalized_rms_error"]))
