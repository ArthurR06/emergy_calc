from __future__ import annotations

from app.calculator import EmergyCalculator


def test_calculate_process_with_uev_and_indicators():
    processes = [{"id": 1, "name": "Processo A"}]
    flows = [
        {"id": 1, "process_id": 1, "flow_name": "Sol", "amount": 100, "unit": "MJ", "resource_type": "R", "uev": 1e6},
        {"id": 2, "process_id": 1, "flow_name": "Minério", "amount": 2, "unit": "g", "resource_type": "N", "uev": 1e9},
        {"id": 3, "process_id": 1, "flow_name": "Eletricidade", "amount": 50, "unit": "J", "resource_type": "F", "uev": 2e5},
    ]

    calc = EmergyCalculator(processes, flows)
    result = calc.calculate_process(1)

    assert result["total_emergy"] == 100 * 1e6 + 2 * 1e9 + 50 * 2e5
    assert result["totals_by_resource_type"]["R"] == 100 * 1e6
    assert result["totals_by_resource_type"]["N"] == 2 * 1e9
    assert result["totals_by_resource_type"]["F"] == 50 * 2e5
    assert result["indicators"]["EYR"] is not None
    assert result["indicators"]["ELR"] is not None
    assert result["indicators"]["ESI"] is not None
