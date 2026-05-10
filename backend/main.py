import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from invoice_processor import process_invoice
from chat_service import chat
from masterdata_service import generate_masterdata

app = FastAPI(title="Invoice Extractor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")
os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)


# ── Models ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    target_files: list[str] | None = None


class MasterdataRequest(BaseModel):
    columns: list[str]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload-invoice")
async def upload_invoice(file: UploadFile = File(...)):
    allowed = {".pdf", ".jpg", ".jpeg", ".png"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported. Use PDF, JPG, or PNG.")

    temp_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}{ext}")
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        result = process_invoice(temp_path, file.filename, STORAGE_DIR)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/invoices")
def list_invoices():
    excel_files = sorted(Path(STORAGE_DIR).glob("*.xlsx"))
    invoices = []
    for f in excel_files:
        stat = f.stat()
        invoices.append({
            "filename": f.name,
            "stem": f.stem,
            "size_kb": round(stat.st_size / 1024, 1),
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        })
    return {"invoices": invoices}


@app.get("/invoices/{filename}/download")
def download_invoice(filename: str):
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )


@app.delete("/invoices/{filename}")
def delete_invoice(filename: str):
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    os.remove(file_path)
    return {"success": True, "deleted": filename}


@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    if not os.getenv("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured.")
    try:
        reply = chat(req.message, req.history, STORAGE_DIR, req.target_files)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-masterdata")
def generate_masterdata_endpoint(req: MasterdataRequest):
    if not req.columns:
        raise HTTPException(status_code=400, detail="Please provide at least one column name.")

    output_filename = f"masterdata_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    output_path = os.path.join(STORAGE_DIR, output_filename)

    try:
        result = generate_masterdata(STORAGE_DIR, req.columns, output_path)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/masterdata/files")
def list_masterdata_files():
    files = sorted(Path(STORAGE_DIR).glob("masterdata_*.xlsx"), reverse=True)
    return {
        "files": [
            {
                "filename": f.name,
                "size_kb": round(f.stat().st_size / 1024, 1),
                "created_at": datetime.fromtimestamp(f.stat().st_ctime).isoformat(),
            }
            for f in files
        ]
    }


@app.get("/masterdata/{filename}/download")
def download_masterdata(filename: str):
    if not filename.startswith("masterdata_"):
        raise HTTPException(status_code=400, detail="Invalid filename.")
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )
