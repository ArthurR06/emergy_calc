let selectedManageProcessId = '';

const api = {
  async getProcesses() {
    const res = await fetch('/api/processes');
    return handleResponse(res);
  },
  async createProcess(payload) {
    return fetchJson('/api/processes', 'POST', payload);
  },
  async updateProcess(id, payload) {
    return fetchJson(`/api/processes/${id}`, 'PUT', payload);
  },
  async deleteProcess(id) {
    return fetchJson(`/api/processes/${id}`, 'DELETE');
  },
  async createFlow(payload) {
    return fetchJson('/api/flows', 'POST', payload);
  },
  async updateFlow(id, payload) {
    return fetchJson(`/api/flows/${id}`, 'PUT', payload);
  },
  async deleteFlow(id) {
    return fetchJson(`/api/flows/${id}`, 'DELETE');
  },
  async calculate(id) {
    const res = await fetch(`/api/calculate/${id}`);
    return handleResponse(res);
  },
  async importCsv(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/import-csv', { method: 'POST', body: formData });
    return handleResponse(res);
  }
};

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => (toast.style.display = 'none'), 2600);
}

async function handleResponse(res) {
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Erro interno no servidor.');
  }

  if (!res.ok) {
    throw new Error(data.detail || 'Erro na operação');
  }

  return data;
}

async function fetchJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  return handleResponse(res);
}

function getProcessPayload() {
  return {
    name: document.getElementById('process-name').value,
    category: document.getElementById('process-category').value,
    description: document.getElementById('process-description').value || null,
  };
}

function getFlowPayload() {
  const flowType = document.getElementById('flow-type').value;
  const sourceValue = document.getElementById('flow-source-process-id').value;

  return {
    process_id: Number(document.getElementById('flow-process-id').value),
    flow_name: document.getElementById('flow-name').value,
    flow_type: flowType,
    amount: Number(document.getElementById('flow-amount').value),
    unit: document.getElementById('flow-unit').value,
    transformity: Number(document.getElementById('flow-transformity').value),
    source_process_id: flowType === 'intermediate' && sourceValue ? Number(sourceValue) : null,
    split_fraction: Number(document.getElementById('flow-split-fraction').value),
    notes: document.getElementById('flow-notes').value || null,
  };
}

function resetProcessForm() {
  document.getElementById('process-id').value = '';
  document.getElementById('process-form').reset();
  document.getElementById('process-category').value = 'general';
}

function resetFlowForm() {
  document.getElementById('flow-id').value = '';
  document.getElementById('flow-form').reset();
  document.getElementById('flow-unit').value = 'J';
  document.getElementById('flow-split-fraction').value = '1';
}

function processOptionHtml(processes) {
  return processes
    .map((p) => `<option value="${p.id}">${p.id} - ${escapeHtml(p.name)}</option>`)
    .join('');
}

function flowTypeLabel(type) {
  return type === 'intermediate' ? 'Intermediário' : 'Fonte primária';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderProcesses(processes) {
  const container = document.getElementById('process-list');
  const select = document.getElementById('manage-process-id');

  if (!processes.length) {
    if (select) {
      select.innerHTML = '<option value="">Nenhum processo cadastrado</option>';
    }

    container.innerHTML = '<div class="empty-state">Nenhum processo cadastrado ainda.</div>';
    return;
  }

  if (select) {
    select.innerHTML = `
      <option value="">Selecione um processo</option>
      ${processes
        .map(
          (process) =>
            `<option value="${process.id}">${process.id} - ${escapeHtml(process.name)}</option>`
        )
        .join('')}
    `;

    select.value = selectedManageProcessId;
  }

  if (!selectedManageProcessId) {
    container.innerHTML = '<div class="empty-state">Selecione um processo para visualizar os detalhes.</div>';
    return;
  }

  const selectedProcess = processes.find(
    (process) => String(process.id) === String(selectedManageProcessId)
  );

  if (!selectedProcess) {
    selectedManageProcessId = '';
    container.innerHTML = '<div class="empty-state">Processo não encontrado. Selecione outro processo.</div>';
    return;
  }

  const processJson = encodeURIComponent(JSON.stringify(selectedProcess));

  const flowsHtml = selectedProcess.flows.length
    ? `
      <div class="flow-list">
        ${selectedProcess.flows
          .map((flow) => {
            const flowJson = encodeURIComponent(JSON.stringify(flow));

            return `
              <div class="flow-item">
                <div class="flow-top">
                  <div>
                    <div class="flow-title">${escapeHtml(flow.flow_name)}</div>
                    <div class="muted">${flowTypeLabel(flow.flow_type)}</div>
                  </div>

                  <span class="badge ${flow.flow_type === 'source' ? 'primary' : ''}">
                    ${escapeHtml(flow.unit)}
                  </span>
                </div>

                <div class="flow-meta">
                  <span><strong>Quantidade:</strong> ${Number(flow.amount).toFixed(2)}</span>
                  <span><strong>Transformidade:</strong> ${Number(flow.transformity).toFixed(2)}</span>
                  <span><strong>Fração:</strong> ${Number(flow.split_fraction).toFixed(4)}</span>
                </div>

                ${
                  flow.source_process_id
                    ? `<div class="muted" style="margin-top:8px">Origem: processo ${flow.source_process_id}</div>`
                    : ''
                }

                ${
                  flow.notes
                    ? `<div class="muted" style="margin-top:8px">Obs.: ${escapeHtml(flow.notes)}</div>`
                    : ''
                }

                <div class="inline-actions" style="margin-top:12px">
                  <button onclick="editFlowFromData('${flowJson}')">Editar fluxo</button>
                  <button class="danger" onclick="removeFlow(${flow.id})">Excluir fluxo</button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `
    : '<div class="empty-state">Sem fluxos cadastrados.</div>';

  container.innerHTML = `
    <article class="process-card">
      <div class="badge-row">
        <span class="badge primary">Processo #${selectedProcess.id}</span>
        <span class="badge">${escapeHtml(selectedProcess.category)}</span>
      </div>

      <h3>${escapeHtml(selectedProcess.name)}</h3>

      ${
        selectedProcess.description
          ? `<p class="process-description">${escapeHtml(selectedProcess.description)}</p>`
          : '<p class="muted">Sem descrição cadastrada.</p>'
      }

      <div class="inline-actions" style="margin-top:14px">
        <button onclick="editProcessFromData('${processJson}')">Editar processo</button>
        <button class="danger" onclick="removeProcess(${selectedProcess.id})">Excluir processo</button>
      </div>

      <div style="margin-top:16px">
        <strong>Fluxos associados (${selectedProcess.flows.length})</strong>
      </div>

      ${flowsHtml}
    </article>
  `;
}

window.editProcessFromData = function(processEncoded) {
  const process = JSON.parse(decodeURIComponent(processEncoded));

  document.getElementById('process-id').value = process.id;
  document.getElementById('process-name').value = process.name;
  document.getElementById('process-category').value = process.category;
  document.getElementById('process-description').value = process.description || '';

  selectedManageProcessId = String(process.id);

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.editFlowFromData = function(flowEncoded) {
  const flow = JSON.parse(decodeURIComponent(flowEncoded));

  document.getElementById('flow-id').value = flow.id;
  document.getElementById('flow-process-id').value = flow.process_id;
  document.getElementById('flow-name').value = flow.flow_name;
  document.getElementById('flow-type').value = flow.flow_type;
  document.getElementById('flow-amount').value = flow.amount;
  document.getElementById('flow-unit').value = flow.unit;
  document.getElementById('flow-transformity').value = flow.transformity;
  document.getElementById('flow-source-process-id').value = flow.source_process_id || '';
  document.getElementById('flow-split-fraction').value = flow.split_fraction;
  document.getElementById('flow-notes').value = flow.notes || '';

  selectedManageProcessId = String(flow.process_id);

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.removeProcess = async function(id) {
  if (!confirm('Excluir este processo e seus fluxos?')) return;

  try {
    await api.deleteProcess(id);

    if (String(selectedManageProcessId) === String(id)) {
      selectedManageProcessId = '';
    }

    showToast('Processo removido.');
    await refresh();
  } catch (error) {
    showToast(error.message);
  }
};

window.removeFlow = async function(id) {
  if (!confirm('Excluir este fluxo?')) return;

  try {
    await api.deleteFlow(id);
    showToast('Fluxo removido.');
    await refresh();
  } catch (error) {
    showToast(error.message);
  }
};

async function refresh() {
  const processes = await api.getProcesses();
  const html = processOptionHtml(processes);

  document.getElementById('flow-process-id').innerHTML = html;
  document.getElementById('flow-source-process-id').innerHTML = `<option value="">Nenhum</option>${html}`;
  document.getElementById('calculate-process-id').innerHTML = html;

  renderProcesses(processes);
}

async function setupForms() {
  const manageSelect = document.getElementById('manage-process-id');

  if (manageSelect) {
    manageSelect.addEventListener('change', async () => {
      selectedManageProcessId = manageSelect.value;
      const processes = await api.getProcesses();
      renderProcesses(processes);
    });
  }

  document.getElementById('process-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const id = document.getElementById('process-id').value;

      if (id) {
        const updatedProcess = await api.updateProcess(id, getProcessPayload());
        selectedManageProcessId = String(updatedProcess.id);
        showToast('Processo atualizado com sucesso.');
      } else {
        const newProcess = await api.createProcess(getProcessPayload());
        selectedManageProcessId = String(newProcess.id);
        showToast('Processo criado com sucesso.');
      }

      resetProcessForm();
      await refresh();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.getElementById('flow-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const id = document.getElementById('flow-id').value;
      const payload = getFlowPayload();

      if (id) {
        const updatedFlow = await api.updateFlow(id, payload);
        selectedManageProcessId = String(updatedFlow.process_id);
        showToast('Fluxo atualizado com sucesso.');
      } else {
        const newFlow = await api.createFlow(payload);
        selectedManageProcessId = String(newFlow.process_id);
        showToast('Fluxo criado com sucesso.');
      }

      resetFlowForm();
      await refresh();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.getElementById('csv-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = document.getElementById('csv-file').files[0];

    if (!file) {
      return showToast('Selecione um arquivo CSV.');
    }

    try {
      const result = await api.importCsv(file);

      showToast(`${result.imported} fluxo(s) importado(s).`);
      document.getElementById('csv-form').reset();

      await refresh();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.getElementById('calculate-btn').addEventListener('click', async () => {
    const processId = document.getElementById('calculate-process-id').value;

    if (!processId) {
      return showToast('Cadastre um processo primeiro.');
    }

    try {
      const result = await api.calculate(processId);

      document.getElementById('calculation-result').innerHTML = `
        <div class="result-box">
          <div class="result-head">
            <div class="result-title">
              <span class="section-kicker">Resultado</span>
              <h3>${escapeHtml(result.process_name)}</h3>
              <p class="muted">
                Resumo do cálculo simplificado de emergia e das contribuições dos fluxos associados.
              </p>
            </div>

            <div class="metric-grid">
              <div class="metric-card">
                <span>Emergia total</span>
                <strong>${Number(result.total_emergy).toFixed(2)} sej</strong>
              </div>

              <div class="metric-card">
                <span>UEV simplificado</span>
                <strong>${Number(result.uev).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div>
            <strong>Contribuições calculadas (${result.contributions.length} fluxos)</strong>

            <div class="contribution-list" style="margin-top:12px">
              ${
                result.contributions.length
                  ? result.contributions
                      .map(
                        (c) => `
                          <div class="contribution-item">
                            <strong>${escapeHtml(c.flow_name)}</strong>
                            <div>${Number(c.emergy).toFixed(2)} sej</div>
                            <div class="muted" style="margin-top:6px">${escapeHtml(c.details)}</div>
                          </div>
                        `
                      )
                      .join('')
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

  document.getElementById('process-cancel').addEventListener('click', resetProcessForm);
  document.getElementById('flow-cancel').addEventListener('click', resetFlowForm);
}

(async function init() {
  await setupForms();
  await refresh();
})();
