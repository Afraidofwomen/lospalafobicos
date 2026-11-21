"""Lectura de una fórmula con RapidLatexOCR.

La imagen entra como bytes y no se escribe en disco. El modelo lee una sola
expresión, así que el recorte debe ser la fórmula, no la página completa.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from verify import ParseError, _prepare

_MODEL_NAMES = (
    "image_resizer.onnx",
    "encoder.onnx",
    "decoder.onnx",
    "tokenizer.json",
)
_MODEL_URL = "https://github.com/RapidAI/RapidLaTeXOCR/releases/download/v0.0.0"

_engine = None


class EmptyReading(Exception):
    pass


class OcrUnavailable(Exception):
    pass


def build_reading(latex: str) -> dict:
    text = _clean_prediction(latex)
    if not text:
        raise EmptyReading()
    legible = _can_parse(text)
    notes = "Leí una sola fórmula. Confírmala o corrígela antes de seguir."
    if not legible:
        notes = "La lectura no forma una expresión clara. ¿Puedes reescribirla o acercar la foto?"
    return {
        "problem": {
            "latex": text,
            "type": guess_type(text),
            "bbox": [0, 0, 1, 1],
        },
        "steps": [],
        "legibility": "good" if legible else "low",
        "notes": notes,
    }


def guess_type(latex: str) -> str:
    if re.search(r"\\lim(?![A-Za-z])", latex):
        return "limit"
    if re.search(r"\\int(?![A-Za-z])", latex):
        return "integral"
    if re.search(r"\\frac\s*\{\s*d", latex):
        return "derivative"
    return "other"


def read_image(image: bytes) -> dict:
    if not image:
        raise EmptyReading()
    try:
        latex, _elapsed = get_engine()(image)
    except EmptyReading:
        raise
    except Exception as exc:
        raise OcrUnavailable("No pude cargar RapidLatexOCR.") from exc
    return build_reading(str(latex))


def get_engine():
    global _engine
    if _engine is None:
        try:
            from rapid_latex_ocr import LaTeXOCR
        except ImportError as exc:
            raise OcrUnavailable("RapidLatexOCR no está instalado.") from exc
        cache = _vercel_model_dir()
        if cache is None:
            _engine = LaTeXOCR()
        else:
            files = _ensure_models(cache)
            _engine = LaTeXOCR(
                image_resizer_path=files["image_resizer.onnx"],
                encoder_path=files["encoder.onnx"],
                decoder_path=files["decoder.onnx"],
                tokenizer_json=files["tokenizer.json"],
            )
    return _engine


def _vercel_model_dir() -> Path | None:
    if not os.environ.get("VERCEL"):
        return None
    path = Path("/tmp/rapid_latex_ocr")
    path.mkdir(parents=True, exist_ok=True)
    return path


def _ensure_models(directory: Path) -> dict[str, Path]:
    import requests

    paths: dict[str, Path] = {}
    for name in _MODEL_NAMES:
        dest = directory / name
        if not dest.is_file() or dest.stat().st_size == 0:
            partial = dest.with_suffix(dest.suffix + ".part")
            with requests.get(f"{_MODEL_URL}/{name}", stream=True, timeout=300) as response:
                response.raise_for_status()
                with partial.open("wb") as handle:
                    for chunk in response.iter_content(chunk_size=1024 * 256):
                        if chunk:
                            handle.write(chunk)
            partial.replace(dest)
        paths[name] = dest
    return paths


def _clean_prediction(latex: str) -> str:
    text = latex.strip()
    text = text.replace("$$", "").strip()
    if text.startswith("$") and text.endswith("$") and len(text) > 1:
        text = text[1:-1].strip()
    return text


def _can_parse(latex: str) -> bool:
    try:
        _prepare(latex, None)
    except ParseError:
        return False
    return True
