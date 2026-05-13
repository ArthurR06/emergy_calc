from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class FlowContribution:
    flow_id: int
    flow_name: str
    amount: float
    unit: str
    resource_type: str
    uev: float
    emergy: float
    details: str


class EmergyCalculationError(Exception):
    pass


class EmergyCalculator:
    def __init__(self, processes: list[dict[str, Any]], flows: list[dict[str, Any]]):
        self.processes = {int(p["id"]): p for p in processes}
        self.flows_by_process: dict[int, list[dict[str, Any]]] = {}
        for flow in flows:
            self.flows_by_process.setdefault(int(flow["process_id"]), []).append(flow)

    def calculate_process(self, process_id: int) -> dict[str, Any]:
        if process_id not in self.processes:
            raise EmergyCalculationError(f"Processo {process_id} não encontrado.")

        total_emergy = 0.0
        r_total = 0.0
        n_total = 0.0
        f_total = 0.0
        contributions: list[FlowContribution] = []

        for flow in self.flows_by_process.get(process_id, []):
            amount = float(flow["amount"])
            uev = float(flow["uev"])
            resource_type = str(flow["resource_type"]).upper()
            emergy = amount * uev
            details = f"Emergia = {amount} {flow['unit']} × {uev} sej/{flow['unit']}"

            total_emergy += emergy
            if resource_type == "R":
                r_total += emergy
            elif resource_type == "N":
                n_total += emergy
            elif resource_type == "F":
                f_total += emergy
            else:
                raise EmergyCalculationError(
                    f"Tipo de recurso inválido no fluxo '{flow['flow_name']}': {resource_type}"
                )

            contributions.append(
                FlowContribution(
                    flow_id=int(flow["id"]),
                    flow_name=str(flow["flow_name"]),
                    amount=amount,
                    unit=str(flow["unit"]),
                    resource_type=resource_type,
                    uev=uev,
                    emergy=emergy,
                    details=details,
                )
            )

        eyr = (r_total + n_total + f_total) / f_total if f_total > 0 else None
        elr = (n_total + f_total) / r_total if r_total > 0 else None
        esi = (eyr / elr) if (eyr is not None and elr not in (None, 0)) else None

        return {
            "process_id": process_id,
            "process_name": self.processes[process_id]["name"],
            "calculation_method": "UEV_direct_sum",
            "formula": "Emergia = Quantidade × UEV",
            "total_emergy": total_emergy,
            "totals_by_resource_type": {
                "R": r_total,
                "N": n_total,
                "F": f_total,
            },
            "flow_count": len(contributions),
            "indicators": {
                "EYR": eyr,
                "ELR": elr,
                "ESI": esi,
            },
            "contributions": [c.__dict__ for c in contributions],
        }
