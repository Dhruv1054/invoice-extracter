import os
import pandas as pd
from pathlib import Path


def generate_masterdata(storage_dir: str, column_names: list[str], output_path: str) -> dict:
    """
    Scan all Excel files, find rows that contain the requested columns,
    and produce a combined master Excel file.
    """
    storage_path = Path(storage_dir)
    excel_files = list(storage_path.glob("*.xlsx"))

    if not excel_files:
        raise ValueError("No invoices found in storage.")

    collected_rows = []
    matched_invoices = []

    for excel_path in excel_files:
        invoice_name = excel_path.stem
        try:
            xl = pd.ExcelFile(excel_path)
            for sheet_name in xl.sheet_names:
                df = pd.read_excel(excel_path, sheet_name=sheet_name)
                # Case-insensitive column matching
                col_map = {c.lower().strip(): c for c in df.columns}
                matched_cols = {}
                for wanted in column_names:
                    key = wanted.lower().strip()
                    if key in col_map:
                        matched_cols[wanted] = col_map[key]

                if not matched_cols:
                    continue

                subset = df[[matched_cols[w] for w in matched_cols]].copy()
                subset.columns = list(matched_cols.keys())

                # Add source metadata columns
                subset.insert(0, "Source Invoice", invoice_name)
                subset.insert(1, "Source Sheet", sheet_name)

                collected_rows.append(subset)
                matched_invoices.append(f"{invoice_name} / {sheet_name}")
        except Exception:
            continue

    if not collected_rows:
        raise ValueError(
            f"None of the requested columns {column_names} were found in any invoice."
        )

    master_df = pd.concat(collected_rows, ignore_index=True)

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        master_df.to_excel(writer, sheet_name="Master Data", index=False)
        worksheet = writer.sheets["Master Data"]
        for col_idx, col in enumerate(master_df.columns, 1):
            max_len = max(
                len(str(col)),
                *[len(str(v)) for v in master_df.iloc[:, col_idx - 1].tolist()],
                10,
            )
            worksheet.column_dimensions[
                worksheet.cell(1, col_idx).column_letter
            ].width = min(max_len + 2, 50)

    return {
        "total_rows": len(master_df),
        "columns_found": list(matched_cols.keys()) if matched_cols else [],
        "invoices_matched": matched_invoices,
        "output_filename": Path(output_path).name,
    }
