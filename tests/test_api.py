from __future__ import annotations


def test_full_api_flow(client):
    process = client.post(
        "/api/processes",
        json={"name": "ETA", "category": "agua", "description": "Processo de teste"},
    )
    assert process.status_code == 200
    process_id = process.json()["id"]

    flow = client.post(
        "/api/flows",
        json={
            "process_id": process_id,
            "flow_name": "Eletricidade",
            "amount": 100,
            "unit": "J",
            "resource_type": "F",
            "uev": 200000,
            "notes": "teste",
        },
    )
    assert flow.status_code == 200

    result = client.get(f"/api/calculate/{process_id}")
    assert result.status_code == 200
    data = result.json()
    assert data["total_emergy"] == 20000000
    assert data["totals_by_resource_type"]["F"] == 20000000
