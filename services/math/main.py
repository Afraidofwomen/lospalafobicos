"""Microservicio de verificación y lectura de fórmulas.

En local escucha en 127.0.0.1. En Vercel no tiene ruta pública: solo lo llama
la API por el binding interno.
"""

from __future__ import annotations

import base64
import binascii
import multiprocessing as mp
import os
from concurrent.futures import ProcessPoolExecutor, TimeoutError as FuturesTimeout
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ocr import EmptyReading, OcrUnavailable, read_image
from verify import ParseError, verify_payload

_executor: ProcessPoolExecutor | None = None


def _executor_pool() -> ProcessPoolExecutor:
    global _executor
    if _executor is None:
        _executor = ProcessPoolExecutor(max_workers=2, mp_context=mp.get_context("spawn"))
    return _executor


def shutdown_pool() -> None:
    global _executor
    if _executor is not None:
        _executor.shutdown(wait=False, cancel_futures=True)
        _executor = None


def run_verify(data: dict, timeout: float = 5.0) -> dict:
    # El runtime de Vercel no permite un ProcessPool. El tope de la función
    # corta una verificación que no termina.
    if os.environ.get("VERCEL"):
        return verify_payload(data)
    future = _executor_pool().submit(verify_payload, data)
    try:
        return future.result(timeout=timeout)
    except FuturesTimeout as exc:
        future.cancel()
        raise TimeoutError("timeout") from exc


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    shutdown_pool()


app = FastAPI(title="tutor-ar-math", version="0.1.0", lifespan=lifespan)


class VerifyIn(BaseModel):
    problem: str = Field(min_length=1, max_length=2000)
    step: str = Field(min_length=1, max_length=2000)
    relation: Literal["equivalent", "next_valid"]
    type: Literal[
        "limit",
        "continuity",
        "derivative",
        "integral",
        "optimization",
        "related_rates",
        "other",
    ] | None = None


class VerifyOut(BaseModel):
    valid: bool
    reason: str
    counterexample: str | None
    misconception: str | None
    nextStepLatex: str | None = None
    status: Literal["ok", "unverifiable"] = "ok"


class OcrIn(BaseModel):
    imageBase64: str = Field(min_length=20, max_length=2_000_000)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/ocr")
def ocr(body: OcrIn) -> dict:
    try:
        image = base64.b64decode(body.imageBase64, validate=True)
    except (binascii.Error, ValueError):
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "invalid_image", "message": "La imagen no es base64 válido."}},
        )
    try:
        return read_image(image)
    except EmptyReading:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "unreadable",
                    "message": "No pude leer una fórmula. Acerca la foto a una sola expresión.",
                }
            },
        )
    except OcrUnavailable as exc:
        return JSONResponse(
            status_code=503,
            content={"error": {"code": "ocr_unavailable", "message": str(exc)}},
        )


@app.post("/verify", response_model=VerifyOut)
def verify(body: VerifyIn) -> dict:
    payload = body.model_dump()
    try:
        return run_verify(payload, timeout=5)
    except ParseError as exc:
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "parse_error", "message": str(exc)}},
        )
    except TimeoutError:
        return JSONResponse(
            status_code=504,
            content={"error": {"code": "timeout", "message": "La verificación superó 5 segundos."}},
        )
