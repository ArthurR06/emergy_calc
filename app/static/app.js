const api = {
  async getProcesses() {
    const res = await fetch("/api/processes");
    return res.json();
  },
  async createProcess(payload) {
    return fetchJson("/api/processes", "POST", payload);
  },
  async updateProcess(id, payload) {
    return fetchJson(`/api/processes/${id}`, "PUT", payload);
  },
  async deleteProcess(id) {
    return fetchJson(`/api/processes/${id}`, "DELETE");
  },
  async createFlow(payload) {
    return fetchJson("/api/flows", "POST", payload);
  },
  async updateFlow(id, payload) {
    return fetchJson(`/api/flows/${id}`, "PUT", payload);
  },
  async deleteFlow(id) {
    return fetchJson(`/api/flows/${id}`, "DELETE");
  },
  async calculate(id) {
    const res = await fetch(`/api/calculate/${id}`);
    return handleResponse(res);
  },
  async importCsv(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/import-csv", { method: "POST", body: formData });
    return handleResponse(res);
  },
  exportCsv(id) {
    window.open(`/api/report/${id}?format=csv`, "_blank");
  }
};

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Erro na operação");
  return data;
}

async function fetchJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  return handleResponse(res);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function formatNumberBR(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
} 
function getProcessPayload() {
  return {
    name: document.getElementById("process-name").value,
    category: document.getElementById("process-category").value,
    description: document.getElementById("process-description").value || null
  };
}

function getFlowPayload() {
  return {
    process_id: Number(document.getElementById("flow-process-id").value),
    flow_name: document.getElementById("flow-name").value,
    amount: Number(document.getElementById("flow-amount").value),
    unit: document.getElementById("flow-unit").value,
    resource_type: document.getElementById("flow-resource-type").value,
    uev: Number(document.getElementById("flow-uev").value),
    notes: document.getElementById("flow-notes").value || null
  };
}

function resetProcessForm() {
  document.getElementById("process-id").value = "";
  document.getElementById("process-form").reset();
  document.getElementById("process-category").value = "general";
}

function resetFlowForm() {
  document.getElementById("flow-id").value = "";
  document.getElementById("flow-form").reset();
  document.getElementById("flow-unit").value = "J";
  document.getElementById("flow-resource-type").value = "R";
}

function processOptionHtml(processes) {
  return processes
    .map((p) => `<option value="${p.id}">${p.id} - ${escapeHtml(p.name)}</option>`)
    .join("");
}

function resourceTypeLabel(type) {
  if (type === "R") return "Renovável";
  if (type === "N") return "Não renovável";
  return "Economia/Feedback";
}

function renderProcesses(processes) {
  const container = document.getElementById("process-list");

  if (!processes.length) {
    container.innerHTML = `<div class="empty-state">Nenhum processo cadastrado ainda.</div>`;
    return;
  }

  container.innerHTML = processes
    .map((process) => {
      const processJson = encodeURIComponent(JSON.stringify(process));
      const flowsHtml = process.flows?.length
        ? `<div class="flow-list">${process.flows
            .map((flow) => {
              const flowJson = encodeURIComponent(JSON.stringify(flow));
              return `
                <div class="flow-item">
                  <div class="flow-top">
                    <div>
                      <div class="flow-title">${escapeHtml(flow.flow_name)}</div>
                      <div class="muted">${resourceTypeLabel(flow.resource_type)}</div>
                    </div>
                    <span class="badge primary">${escapeHtml(flow.unit)}</span>
                  </div>
                  <div class="flow-meta">
                    <span><strong>Quantidade:</strong> ${Number(flow.amount).toFixed(2)}</span>
                    <span><strong>UEV:</strong> ${Number(flow.uev).toExponential(2)}</span>
                    <span><strong>Tipo:</strong> ${escapeHtml(flow.resource_type)}</span>
                  </div>
                  ${flow.notes ? `<div class="muted" style="margin-top:8px">Obs.: ${escapeHtml(flow.notes)}</div>` : ""}
                  <div class="inline-actions" style="margin-top:12px">
                    <button type="button" onclick="editFlowFromData('${flowJson}')">Editar fluxo</button>
                    <button type="button" class="danger" onclick="removeFlow(${flow.id})">Excluir fluxo</button>
                  </div>
                </div>
              `;
            })
            .join("")}</div>`
        : `<div class="empty-state">Sem fluxos cadastrados.</div>`;

      return `
        <article class="process-card">
          <div class="badge-row">
            <span class="badge primary">Processo #${process.id}</span>
            <span class="badge">${escapeHtml(process.category)}</span>
          </div>
          <h3>${escapeHtml(process.name)}</h3>
          ${process.description ? `<p class="process-description">${escapeHtml(process.description)}</p>` : `<p class="muted">Sem descrição cadastrada.</p>`}
          <div class="inline-actions" style="margin-top:14px">
            <button type="button" onclick="editProcessFromData('${processJson}')">Editar processo</button>
            <button type="button" class="danger" onclick="removeProcess(${process.id})">Excluir processo</button>
          </div>
          <div style="margin-top:16px">
            <strong>Fluxos associados</strong>
          </div>
          ${flowsHtml}
        </article>
      `;
    })
    .join("");
}

window.editProcessFromData = function (processEncoded) {
  const process = JSON.parse(decodeURIComponent(processEncoded));
  document.getElementById("process-id").value = process.id;
  document.getElementById("process-name").value = process.name;
  document.getElementById("process-category").value = process.category;
  document.getElementById("process-description").value = process.description || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.editFlowFromData = function (flowEncoded) {
  const flow = JSON.parse(decodeURIComponent(flowEncoded));
  document.getElementById("flow-id").value = flow.id;
  document.getElementById("flow-process-id").value = flow.process_id;
  document.getElementById("flow-name").value = flow.flow_name;
  document.getElementById("flow-amount").value = flow.amount;
  document.getElementById("flow-unit").value = flow.unit;
  document.getElementById("flow-resource-type").value = flow.resource_type;
  document.getElementById("flow-uev").value = flow.uev;
  document.getElementById("flow-notes").value = flow.notes || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.removeProcess = async function (id) {
  if (!confirm("Excluir este processo e seus fluxos?")) return;
  try {
    await api.deleteProcess(id);
    showToast("Processo removido.");
    await refresh();
  } catch (error) {
    showToast(error.message);
  }
};

window.removeFlow = async function (id) {
  if (!confirm("Excluir este fluxo?")) return;
  try {
    await api.deleteFlow(id);
    showToast("Fluxo removido.");
    await refresh();
  } catch (error) {
    showToast(error.message);
  }
};

async function refresh() {
  const processes = await api.getProcesses();
  renderProcesses(processes);

  const html = processOptionHtml(processes);
  document.getElementById("flow-process-id").innerHTML = html;
  document.getElementById("calculate-process-id").innerHTML = html;
}

async function setupForms() {
  document.getElementById("process-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const id = document.getElementById("process-id").value;
      if (id) {
        await api.updateProcess(id, getProcessPayload());
        showToast("Processo atualizado com sucesso.");
      } else {
        await api.createProcess(getProcessPayload());
        showToast("Processo criado com sucesso.");
      }
      resetProcessForm();
      await refresh();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.getElementById("flow-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const id = document.getElementById("flow-id").value;
      if (id) {
        await api.updateFlow(id, getFlowPayload());
        showToast("Fluxo atualizado com sucesso.");
      } else {
        await api.createFlow(getFlowPayload());
        showToast("Fluxo criado com sucesso.");
      }
      resetFlowForm();
      await refresh();
    } catch (error) {
      showToast(error.message);
      console.error(error);
    }
  });

  document.getElementById("csv-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("csv-file").files[0];
    if (!file) {
      showToast("Selecione um arquivo CSV.");
      return;
    }
    try {
      const result = await api.importCsv(file);
      showToast(`${result.imported} fluxo(s) importado(s).`);
      document.getElementById("csv-form").reset();
      await refresh();
    } catch (error) {
      showToast(error.message);
    }
  });
document.getElementById("calculate-btn").addEventListener("click", async () => {
  const processId = document.getElementById("calculate-process-id").value;
  if (!processId) {
    showToast("Cadastre um processo primeiro.");
    return;
  }

  try {
    const result = await api.calculate(processId);
    document.getElementById("calculation-result").innerHTML = `
      <div class="result-box">
        <div class="result-head">
          <div class="result-title">
            <span class="section-kicker">Resultado</span>
            <h3>${escapeHtml(result.process_name)}</h3>
           <p class="muted">Resultado do cálculo emergético com base nos fluxos cadastrados no inventário e nos indicadores EYR, ELR e ESI.</p>          </div>
          <div class="metric-grid">
            <div class="metric-card">
              <span>Emergia total</span>
              <strong>${formatNumberBR(result.total_emergy, 2)} sej</strong>
            </div>
            <div class="metric-card">
              <span>R total</span>
              <strong>${formatNumberBR(result.totals_by_resource_type.R, 2)}</strong>
            </div>
            <div class="metric-card">
              <span>N total</span>
              <strong>${formatNumberBR(result.totals_by_resource_type.N, 2)}</strong>
            </div>
            <div class="metric-card">
              <span>F total</span>
              <strong>${formatNumberBR(result.totals_by_resource_type.F, 2)}</strong>
            </div>
            <div class="metric-card">
              <span>EYR</span>
              <strong>${formatNumberBR(result.indicators.EYR, 4)}</strong>
            </div>
            <div class="metric-card">
              <span>ELR</span>
              <strong>${formatNumberBR(result.indicators.ELR, 4)}</strong>
            </div>
            <div class="metric-card">
              <span>ESI</span>
              <strong>${formatNumberBR(result.indicators.ESI, 4)}</strong>
            </div>
          </div>
        </div>

        <div>
          <strong>Contribuições</strong>
          <div class="contribution-list" style="margin-top:12px">
            ${
              result.contributions.length
                ? result.contributions
                    .map(
                      (c) => `
                      <div class="contribution-item">
                        <strong>${escapeHtml(c.flow_name)}</strong>
                        <div>${formatNumberBR(c.emergy, 2)} sej</div>
                        <div class="muted" style="margin-top:6px">
                          Tipo: ${escapeHtml(c.resource_type)} |
                          Quantidade: ${formatNumberBR(c.amount, 4)} |
                          UEV: ${formatNumberBR(c.uev, 2)}
                        </div>
                      </div>`
                    )
                    .join("")
                : '<div class="empty-state">Sem fluxos para calcular.</div>'
            }
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message);
  }
});
  document.getElementById("download-report-btn").addEventListener("click", async () => {
    const processId = document.getElementById("calculate-process-id").value;
    if (!processId) {
      showToast("Selecione um processo para exportar.");
      return;
    }
    api.exportCsv(processId);
  });

  document.getElementById("process-cancel").addEventListener("click", resetProcessForm);
  document.getElementById("flow-cancel").addEventListener("click", resetFlowForm);
}

(async function init() {
  await setupForms();
  await refresh();
})();