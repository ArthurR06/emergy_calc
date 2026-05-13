from __future__ import annotations

import csv
import io
from typing import Any

from .calculator import EmergyCalculator
from .db import execute, execute_many, fetch_all, fetch_one


PROCESS_SELECT = "SELECT * FROM processes ORDER BY id DESC"
FLOW_SELECT = "SELECT * FROM flows ORDER BY id DESC"


class NotFoundError(Exception):
    pass


def list_processes() -> list[dict[str, Any]]:
    processes = fetch_all(PROCESS_SELECT)
    for process in processes:
        process["flows"] = fetch_all(
            "SELECT * FROM flows WHERE process_id = ? ORDER BY id DESC", (process["id"],)
        )
    return processes


def get_process(process_id: int) -> dict[str, Any]:
    process = fetch_one("SELECT * FROM processes WHERE id = ?", (process_id,))
    if not process:
        raise NotFoundError("Processo não encontrado.")
    process["flows"] = fetch_all(
        "SELECT * FROM flows WHERE process_id = ? ORDER BY id DESC", (process_id,)
    )
    return process


def create_process(payload: dict[str, Any]) -> dict[str, Any]:
    new_id = execute(
        "INSERT INTO processes (name, category, description) VALUES (?, ?, ?)",
        (payload["name"], payload["category"], payload.get("description")),
    )
    return get_process(new_id)


def update_process(process_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    if not fetch_one("SELECT id FROM processes WHERE id = ?", (process_id,)):
        raise NotFoundError("Processo não encontrado.")
    execute(
        "UPDATE processes SET name = ?, category = ?, description = ? WHERE id = ?",
        (payload["name"], payload["category"], payload.get("description"), process_id),
    )
    return get_process(process_id)


def delete_process(process_id: int) -> None:
    if not fetch_one("SELECT id FROM processes WHERE id = ?", (process_id,)):
        raise NotFoundError("Processo não encontrado.")
    execute("DELETE FROM processes WHERE id = ?", (process_id,))


def create_flow(payload: dict[str, Any]) -> dict[str, Any]:
    process_exists = fetch_one("SELECT id FROM processes WHERE id = ?", (payload["process_id"],))
    if not process_exists:
        raise NotFoundError("Processo de destino não encontrado.")

    new_id = execute(
        """
        INSERT INTO flows (process_id, flow_name, amount, unit, resource_type, uev, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["process_id"],
            payload["flow_name"],
            payload["amount"],
            payload["unit"],
            payload["resource_type"],
            payload["uev"],
            payload.get("notes"),
        ),
    )
    flow = fetch_one("SELECT * FROM flows WHERE id = ?", (new_id,))
    if flow is None:
        raise NotFoundError("Fluxo não encontrado após a criação.")
    return flow


def update_flow(flow_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    existing = fetch_one("SELECT * FROM flows WHERE id = ?", (flow_id,))
    if not existing:
        raise NotFoundError("Fluxo não encontrado.")

    execute(
        """
        UPDATE flows
        SET flow_name = ?, amount = ?, unit = ?, resource_type = ?, uev = ?, notes = ?
        WHERE id = ?
        """,
        (
            payload["flow_name"],
            payload["amount"],
            payload["unit"],
            payload["resource_type"],
            payload["uev"],
            payload.get("notes"),
            flow_id,
        ),
    )
    flow = fetch_one("SELECT * FROM flows WHERE id = ?", (flow_id,))
    if flow is None:
        raise NotFoundError("Fluxo não encontrado após a atualização.")
    return flow


def delete_flow(flow_id: int) -> None:
    if not fetch_one("SELECT id FROM flows WHERE id = ?", (flow_id,)):
        raise NotFoundError("Fluxo não encontrado.")
    execute("DELETE FROM flows WHERE id = ?", (flow_id,))


def calculate_process_emergy(process_id: int) -> dict[str, Any]:
    processes = fetch_all("SELECT * FROM processes")
    flows = fetch_all("SELECT * FROM flows")
    calculator = EmergyCalculator(processes, flows)
    return calculator.calculate_process(process_id)


def build_process_report(process_id: int) -> dict[str, Any]:
    process = get_process(process_id)
    calculation = calculate_process_emergy(process_id)
    return {
        "process": {
            "id": process["id"],
            "name": process["name"],
            "category": process["category"],
            "description": process["description"],
        },
        "flows": process["flows"],
        "calculation": calculation,
    }


def report_to_csv(report: dict[str, Any]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["process_id", report["process"]["id"]])
    writer.writerow(["process_name", report["process"]["name"]])
    writer.writerow(["formula", report["calculation"]["formula"]])
    writer.writerow(["total_emergy", report["calculation"]["total_emergy"]])
    writer.writerow([])
    writer.writerow(["resource_type", "total"])
    for key, value in report["calculation"]["totals_by_resource_type"].items():
        writer.writerow([key, value])
    writer.writerow([])
    writer.writerow(["indicator", "value"])
    for key, value in report["calculation"]["indicators"].items():
        writer.writerow([key, value])
    writer.writerow([])
    writer.writerow(["flow_id", "flow_name", "amount", "unit", "resource_type", "uev", "emergy"])
    for item in report["calculation"]["contributions"]:
        writer.writerow(
            [
                item["flow_id"],
                item["flow_name"],
                item["amount"],
                item["unit"],
                item["resource_type"],
                item["uev"],
                item["emergy"],
            ]
        )
    return output.getvalue()


def import_flows_from_csv(csv_text: str) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(csv_text))
    required_columns = {
        "process_id",
        "flow_name",
        "amount",
        "unit",
        "resource_type",
        "uev",
        "notes",
    }

    if not reader.fieldnames or not required_columns.issubset(set(reader.fieldnames)):
        raise ValueError(
            "CSV inválido. As colunas obrigatórias são: process_id, flow_name, amount, unit, resource_type, uev, notes."
        )

    params_list: list[tuple[Any, ...]] = []
    imported = 0
    for row in reader:
        resource_type = row["resource_type"].strip().upper()
        if resource_type not in {"R", "N", "F"}:
            raise ValueError(f"Tipo de recurso inválido no CSV: {resource_type}")
        params_list.append(
            (
                int(row["process_id"]),
                row["flow_name"],
                float(row["amount"]),
                row["unit"],
                resource_type,
                float(row["uev"]),
                row.get("notes") or None,
            )
        )
        imported += 1

    execute_many(
        """
        INSERT INTO flows (process_id, flow_name, amount, unit, resource_type, uev, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        params_list,
    )
    return {"imported": imported}
