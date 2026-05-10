import os
import openai
import pandas as pd
from pathlib import Path

client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

SYSTEM_PROMPT = """You are an intelligent invoice assistant. You have access to invoice data stored as Excel files.
When answering questions, be precise and cite the specific invoice/table where you found the information.
Format numbers clearly (currency, percentages, quantities). If a question cannot be answered from the available data, say so clearly."""


def load_excel_data(storage_dir: str, target_files: list[str] | None = None) -> str:
    """Load Excel files into a structured text representation for Claude."""
    storage_path = Path(storage_dir)
    excel_files = list(storage_path.glob("*.xlsx"))

    if not excel_files:
        return "No invoice data available."

    if target_files:
        excel_files = [f for f in excel_files if f.name in target_files]

    context_parts = []
    for excel_path in excel_files:
        invoice_name = excel_path.stem
        context_parts.append(f"\n=== INVOICE: {invoice_name} ===")
        try:
            xl = pd.ExcelFile(excel_path)
            for sheet_name in xl.sheet_names:
                df = pd.read_excel(excel_path, sheet_name=sheet_name)
                context_parts.append(f"\nTable: {sheet_name}")
                context_parts.append(df.to_string(index=False))
        except Exception as e:
            context_parts.append(f"[Error reading {invoice_name}: {e}]")

    return "\n".join(context_parts)


def chat(
    message: str,
    history: list[dict],
    storage_dir: str,
    target_files: list[str] | None = None,
) -> str:
    """Send a message with invoice context and return Claude's response."""
    invoice_data = load_excel_data(storage_dir, target_files)

    system = f"{SYSTEM_PROMPT}\n\nAVAILABLE INVOICE DATA:\n{invoice_data}"

    messages = [{"role": "system", "content": system}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model=os.getenv("OPENROUTER_MODEL", "anthropic/claude-3-haiku"),
        max_tokens=2048,
        messages=messages,
    )

    return response.choices[0].message.content
