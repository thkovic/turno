// URL do seu Google Apps Script publicado como Web App
const GAS_URL = "https://script.google.com/macros/s/SEU_ID/exec"; // substitua pelo link do seu Web App

// Referências aos elementos do DOM
const loginForm = document.getElementById("loginForm");
const loginDiv = document.getElementById("loginDiv");
const registroDiv = document.getElementById("registroDiv");
const matricula = document.getElementById("matricula");
const turnoForm = document.getElementById("turnoForm");
const searchInput = document.getElementById("searchInput");
const btnPDF = document.getElementById("btnPDF");
const modalDetalhes = document.getElementById("modalDetalhes");
const modalFields = document.getElementById("modalFields");
const modalButtons = document.getElementById("modalButtons");
const watchdogEl = document.getElementById("watchdog");
const logDiv = document.getElementById("logDiv");
const btnLog = document.getElementById("btnLog");
const btnLogout = document.getElementById("btnLogout");

// Campos do formulário de registro
const nome = document.getElementById("nome");
const data = document.getElementById("data");
const equipamento = document.getElementById("equipamento");
const acionamento = document.getElementById("acionamento");
const problema = document.getElementById("problema");
const solucao = document.getElementById("solucao");
const encerramento = document.getElementById("encerramento");

// Variáveis de controle
let fullHistory = [];
let registroSelecionado = null;

/* ---------- LOGIN ---------- */
loginForm.onsubmit = async e => {
  e.preventDefault();
  const mat = document.getElementById("loginMatricula").value;
  loginDiv.style.display = "none";
  registroDiv.style.display = "block";
  matricula.value = mat;
  await loadHistory(mat);
  registrarLog(mat, "Login");
};

/* ---------- LOGOUT ---------- */
function logout() {
  registrarLog(matricula.value, "Logout");
  registroDiv.style.display = "none";
  loginDiv.style.display = "block";
  turnoForm.reset();
  matricula.value = "";
  loadHistory();
  logDiv.style.display = "none";
}
btnLogout.onclick = logout;

/* ---------- CARREGAR HISTÓRICO ---------- */
async function loadHistory(matriculaFiltro = null) {
  const url = GAS_URL + "?action=getHistorico" + (matriculaFiltro ? "&matricula=" + matriculaFiltro : "");
  const res = await fetch(url);
  const d = await res.json();
  fullHistory = d || [];
  renderHistory(fullHistory);
}

function renderHistory(data) {
  const t = document.querySelector("#historyTable tbody");
  t.innerHTML = "";
  if (!data.length) {
    t.innerHTML = '<tr><td colspan="9">Sem registros</td></tr>';
    return;
  }
  data.forEach(r => {
    let tr = document.createElement("tr");
    tr.onclick = () => abrirModal(r);
    r.slice(0, 9).forEach(col => {
      let td = document.createElement("td");
      td.textContent = col;
      tr.appendChild(td);
    });
    t.appendChild(tr);
  });
}
searchInput.oninput = () => renderHistory(fullHistory);

/* ---------- MODAL ---------- */
function abrirModal(r) {
  registroSelecionado = r;
  modalFields.innerHTML = `
    <div><strong>ID:</strong> ${r[0]}</div>
    <div><strong>Data:</strong> ${r[1]}</div>
    <div><strong>Executante:</strong> ${r[2]}</div>
    <div><strong>Matrícula:</strong> ${r[3]}</div>
    <div><strong>Equipamento:</strong> ${r[4]}</div>
    <div><strong>Acionamento:</strong> ${r[5]}</div>
    <div><strong>Problema:</strong> ${r[6]}</div>
    <div><strong>Solução:</strong> ${r[7]}</div>
    <div><strong>Encerramento:</strong> ${r[8]}</div>
  `;
  modalButtons.innerHTML = `<button onclick="fecharModal()">Fechar</button>`;
  if (matricula.value === r[3]) {
    modalButtons.innerHTML += `
      <button onclick="editarRegistro()">Editar</button>
      <button onclick="deletarRegistro()">Deletar</button>
    `;
  }
  modalDetalhes.style.display = "flex";
}
function fecharModal() {
  modalDetalhes.style.display = "none";
}

/* ---------- EDITAR ---------- */
function editarRegistro() {
  if (!registroSelecionado) return;
  nome.value = registroSelecionado[2];
  matricula.value = registroSelecionado[3];
  data.value = registroSelecionado[1].split("/").reverse().join("-");
  equipamento.value = registroSelecionado[4];
  acionamento.value = registroSelecionado[5];
  problema.value = registroSelecionado[6];
  solucao.value = registroSelecionado[7];
  encerramento.value = registroSelecionado[8];
  fecharModal();
  turnoForm.onsubmit = async e => {
    e.preventDefault();
    const p = {
      nome: nome.value,
      matricula: matricula.value,
      data: data.value,
      equipamento: equipamento.value,
      acionamento: acionamento.value,
      problema: problema.value,
      solucao: solucao.value,
      encerramento: encerramento.value
    };
    const res = await fetch(GAS_URL + "?action=editarRegistro&id=" + registroSelecionado[0], {
      method: "POST",
      body: JSON.stringify(p),
      headers: { "Content-Type": "application/json" }
    });
    const r = await res.json();
    if (r.success) {
      alert("Registro atualizado!");
      turnoForm.reset();
      loadHistory(matricula.value || null);
      registrarLog(matricula.value, "Editar Registro", "ID: " + registroSelecionado[0]);
      logout();
    } else {
      alert("Erro: " + r.message);
    }
  };
}

/* ---------- DELETAR ---------- */
async function deletarRegistro() {
  if (!registroSelecionado) return;
  if (!confirm("Tem certeza que deseja deletar este registro?")) return;
  const res = await fetch(GAS_URL + "?action=deletarRegistro&id=" + registroSelecionado[0], {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  const r = await res.json();
  if (r.success) {
    alert("Registro deletado!");
    fecharModal();
    loadHistory(matricula.value || null);
    registrarLog(matricula.value, "Deletar Registro", "ID: " + registroSelecionado[0]);
    logout();
  } else {
    alert("Erro: " + r.message);
  }
}

/* ---------- NOVO REGISTRO ---------- */
turnoForm.onsubmit = async e => {
  e.preventDefault();
  const p = {
    nome: nome.value,
    matricula: matricula.value,
    data: data.value,
    equipamento: equipamento.value,
    acionamento: acionamento.value,
    problema: problema.value,
    solucao: solucao.value,
    encerramento: encerramento.value
  };
  const res = await fetch(GAS_URL + "?action=registrarTurno", {
    method: "POST",
    body: JSON.stringify(p),
    headers: { "Content-Type": "application/json" }
  });
  const r = await res.json();
  if (r.success) {
    alert("Registro salvo!");
    turnoForm.reset();
    loadHistory(matricula.value || null);
    registrarLog(matricula.value, "Novo Registro", "ID: " + r.id);
    logout();
  } else {
    alert("Erro: " + r.message);
  }
};

/* ---------- WATCHDOG ---------- */
async function atualizarWatchdog() {
  try {
    const res = await fetch(GAS_URL + "?action=getWatchdog");
    const d = await res.json();
    watchdogEl.textContent = "Watchdog: " + d.status;
  } catch (err) {
    watchdogEl.textContent = "Watchdog: erro";
  }
}
setInterval(atualizarWatchdog, 5000);
atualizarWatchdog();

/* ---------- LOG ---------- */
async function registrarLog(matricula, acao, detalhe = "") {
  try {
    await fetch(GAS_URL + "?action=registrarLog", {
      method: "POST",
      body: JSON.stringify({ matricula, acao, detalhe }),
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Erro ao registrar log:", err);
  }
}
btnLog.onclick = async () => {
  try {
    const res = await fetch(GAS_URL + "?action=getLog");
    const logs = await res.json();
    let txt = "Sistema de Log:\n\n";
    logs.forEach(l => {
      txt += `${l[0]} - ${l[1]} - ${l[2]} - ${l[3]}\n`;
    });
    alert(txt);
  } catch (err) {
    alert("Erro ao carregar log");
  }
};

/* ---------- PDF ---------- */
btnPDF.onclick = async () => {
  try {
    const res = await fetch(GAS_URL + "?action=gerarPDF");
    const url = await res.json();
    window.open(url, "_blank");
  } catch (err) {
    alert("Erro ao gerar PDF");
  }
};
