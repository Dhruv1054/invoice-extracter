import openai
import base64
import json
import os
import re
import pdfplumber
import pandas as pd
from pathlib import Path
import io

client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

EXTRACTION_PROMPT = """You are an expert invoice data extractor. Analyze this invoice image and extract ALL tables present.

For each table found, return a JSON object with:
- "table_name": a descriptive name for the table (e.g., "Line Items", "Tax Summary", etc.)
- "headers": list of column header strings
- "rows": list of rows, where each row is a list of cell values (as strings)

Return a JSON array of all tables found. If only one table exists, still return an array with one element.

Important:
- Preserve all numeric values exactly as shown
- Include all columns even if some cells are empty (use empty string "")
- Do not skip any rows
- Return ONLY valid JSON, no markdown, no explanation

Example format:
[
  {
    "table_name": "Line Items",
    "headers": ["Description", "Qty", "Unit Price", "Total"],
    "rows": [
      ["Widget A", "2", "50.00", "100.00"],
      ["Widget B", "1", "75.00", "75.00"]
    ]
  }
]"""


def pdf_to_images(pdf_path: str) -> list[bytes]:
    """Convert PDF pages to images."""
    images = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            img = page.to_image(resolution=200)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            images.append(buf.getvalue())
    return images


def extract_tables_from_image(image_bytes: bytes, media_type: str = "image/png") -> list[dict]:
    """Send image to a vision model via OpenRouter and extract table data."""
    b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")

    response = client.chat.completions.create(
        model="anthropic/claude-3.5-sonnet",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64_image}"},
                    },
                    {"type": "text", "text": EXTRACTION_PROMPT},
                ],
            }
        ],
    )

    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def tables_to_excel(tables: list[dict], output_path: str) -> str:
    """Write extracted tables to an Excel file, one sheet per table."""
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        for i, table in enumerate(tables):
            sheet_name = table.get("table_name", f"Table_{i+1}")[:31]  # Excel sheet name limit
            headers = table.get("headers", [])
            rows = table.get("rows", [])

            if not headers and not rows:
                continue

            df = pd.DataFrame(rows, columns=headers if headers else None)
            df.to_excel(writer, sheet_name=sheet_name, index=False)

            # Auto-fit columns
            worksheet = writer.sheets[sheet_name]
            for col_idx, col in enumerate(df.columns, 1):
                max_len = max(
                    len(str(col)),
                    *[len(str(v)) for v in df.iloc[:, col_idx - 1].tolist()],
                    10,
                )
                worksheet.column_dimensions[worksheet.cell(1, col_idx).column_letter].width = min(max_len + 2, 50)

    return output_path


def process_invoice(file_path: str, original_filename: str, storage_dir: str) -> dict:
    """
    Full pipeline: file → Claude vision → tables → Excel.
    Returns metadata about the processed invoice.
    """
    ext = Path(original_filename).suffix.lower()
    all_tables: list[dict] = []

    if ext == ".pdf":
        page_images = pdf_to_images(file_path)
        for page_bytes in page_images:
            page_tables = extract_tables_from_image(page_bytes, "image/png")
            all_tables.extend(page_tables)
    elif ext in {".jpg", ".jpeg"}:
        with open(file_path, "rb") as f:
            image_bytes = f.read()
        all_tables = extract_tables_from_image(image_bytes, "image/jpeg")
    elif ext == ".png":
        with open(file_path, "rb") as f:
            image_bytes = f.read()
        all_tables = extract_tables_from_image(image_bytes, "image/png")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    if not all_tables:
        raise ValueError("No tables found in the invoice.")

    stem = Path(original_filename).stem
    excel_filename = f"{stem}.xlsx"
    excel_path = os.path.join(storage_dir, excel_filename)
    tables_to_excel(all_tables, excel_path)

    return {
        "original_filename": original_filename,
        "excel_filename": excel_filename,
        "tables_extracted": len(all_tables),
        "table_names": [t.get("table_name", f"Table_{i+1}") for i, t in enumerate(all_tables)],
    }
