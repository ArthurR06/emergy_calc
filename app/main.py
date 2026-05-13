from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .db import init_db
from .schemas import FlowCreate, FlowUpdate, ProcessCreate, ProcessUpdate
from .services import (
    NotFoundError,
    build_process_report,
    calculate_process_emergy,
    create_flow,
    create_process,
    delete_flow,
    delete_process,
    get_process,
    import_flows_from_csv,
    list_processes,
    report_to_csv,
    update_flow,
    update_process,
)

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="Emergy App APS - UEV", version="2.0.0")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

@app.get("/debug-paths")
def debug_paths():
    return {
        "base_dir": str(BASE_DIR),
        "static_dir": str(BASE_DIR / "static"),
        "styles_path": str(BASE_DIR / "static" / "styles.css"),
        "styles_exists": (BASE_DIR / "static" / "styles.css").exists(),
        "templates_dir": str(BASE_DIR / "templates"),
        "index_exists": (BASE_DIR / "templates" / "index.html").exists(),
    }

@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/processes")
def api_list_processes():
    return list_processes()


@app.get("/api/processes/{process_id}")
def api_get_process(process_id: int):
    try:
        return get_process(process_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/processes")
def api_create_process(payload: ProcessCreate):
    return create_process(payload.model_dump())


@app.put("/api/processes/{process_id}")
def api_update_process(process_id: int, payload: ProcessUpdate):
    try:
        return update_process(process_id, payload.model_dump())
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/processes/{process_id}")
def api_delete_process(process_id: int):
    try:
        delete_process(process_id)
        return {"message": "Processo removido com sucesso."}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/flows")
def api_create_flow(payload: FlowCreate):
    try:
        return create_flow(payload.model_dump())
    except (NotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/api/flows/{flow_id}")
def api_update_flow(flow_id: int, payload: FlowUpdate):
    try:
        return update_flow(flow_id, payload.model_dump())
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/api/flows/{flow_id}")
def api_delete_flow(flow_id: int):
    try:
        delete_flow(flow_id)
        return {"message": "Fluxo removido com sucesso."}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/calculate/{process_id}")
def api_calculate(process_id: int):
    try:
        return calculate_process_emergy(process_id)
    except (NotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/report/{process_id}")
def api_report_json(process_id: int):
    try:
        return build_process_report(process_id)
    except (NotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/report/{process_id}/csv")
def api_report_csv(process_id: int):
    try:
        report = build_process_report(process_id)
        csv_content = report_to_csv(report)
        return PlainTextResponse(
            content=csv_content,
            headers={
                "Content-Disposition": f'attachment; filename="process_{process_id}_report.csv"'
            },
            media_type="text/csv",
        )
    except (NotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/import-csv")
async def api_import_csv(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = content.decode("utf-8")
        return import_flows_from_csv(text)
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="O arquivo CSV deve estar em UTF-8.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
