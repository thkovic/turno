// app.js - Frontend para GitHub Pages -> chama seu Apps Script via fetch
const API_URL = "https://script.google.com/macros/s/AKfycbyjN_7typwQ8yFu-4CW6uRV9U4U6z1386BcGz3YAl_-di_KXedC2FFg3NEAIDjuL4ir/exec";
/* --------------- HELPERS --------------- */
async function apiGet(params = {}) {
 const url = new URL(API_URL);
 Object.entries(params).forEach(([k, v]) => {
   if (v !== undefined && v !== null) url.searchParams.append(k, v);
 });
 const res = await fetch(url.toString(), { method: "GET", credentials: "omit" });
 return res.json();
}
async function apiPost(body = {}) {
 const res = await fetch(API_URL, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify(body),
   credentials: "omit"
 });
 return res.json();
}
/* --------------- DOM ELEMENTS --------------- */
const loginForm = document.getElementById("loginForm");
const loginDiv = document.getElementById("loginDiv");
const registroDiv = document.getElementById("registroDiv");
const matriculaInput = document.getElementById("matricula");
const turnoForm = document.getElementById("turnoForm");
const searchInput = document.getElementById("searchInput");
const btnPDF = document.getElementById("btnPDF");
const modalDetalhes = document.getElementById("modalDetalhes");
const modalFields = document.getElementById("modalFields");
const modalButtons = document.getElementById("modalButtons");
const watchdogEl = document.getElementById("watchdog");
const logDiv = document.getElementById("logDiv");
const btnLog = document.getElementById("btnLog");
const historyTableBody = document.querySelector("#historyTable tbody");
const mobileHistory = document.getElementById("mobileHistory");
let fullHistory = [];
let registroSelecionado = null;
/* --------------- LOGIN --------------- */
loginForm.onsubmit = async (e) => {
 e.preventDefault();
 const mat = document.getElementById("loginMatricula").value.trim();
 if (!mat) { alert("Informe a matrícula"); return; }
 // Mostrar UI
 loginDiv.style.display = "none";
 registroDiv.style.display = "block";
 matriculaInput.value = mat;
 // registrar login (log no backend)
 await apiPost({ acao: "registrarLog", matricula: mat, acaoLog: "Login", info: "" });
 // mostrar botão log somente para matrícula específica (mesma lógica antiga)
 if (mat === "991631240") logDiv.style.display = "block";
 else logDiv.style.display = "none";
 await loadHistory(mat);
};
/* --------------- LOGOUT --------------- */
function logout() {
 const mat = matriculaInput.value;
 apiPost({ acao: "registrarLog", matricula: mat, acaoLog: "Logout", info: "" }).catch(()=>{});
 registroDiv.style.display = "none";
 loginDiv.style.display = "block";
 turnoForm.reset();
 matriculaInput.value = "";
 fullHistory = [];
 renderHistory([]);
 logDiv.style.display = "none";
}
/* vincular botão logout */
document.getElementById("btnLogout").onclick = logout;
/* --------------- CARREGAR HISTÓRICO --------------- */
async function loadHistory(matriculaFiltro = null) {
 try {
   const resp = await apiGet({ acao: "getHistorico", matricula: matriculaFiltro || "" });
   fullHistory = Array.isArray(resp) ? resp : [];
   renderHistory(fullHistory);
 } catch (err) {
   console.error("Erro loadHistory:", err);
   historyTableBody.innerHTML = `<tr><td colspan="9">Erro ao carregar</td></tr>`;
   mobileHistory.innerHTML = '';
 }
}
function renderHistory(data) {
 historyTableBody.innerHTML = "";
 mobileHistory.innerHTML = "";
 if (!data || !data.length) {
   historyTableBody.innerHTML = '<tr><td colspan="9">Sem registros</td></tr>';
   mobileHistory.innerHTML = '<p style="text-align:center;color:#888;">Sem registros</p>';
   return;
 }
 const searchTerm = (searchInput.value || "").toLowerCase();
 data.filter(r => r.some(c => String(c).toLowerCase().includes(searchTerm)))
   .forEach(r => {
     // desktop row
     const tr = document.createElement("tr");
     tr.onclick = () => abrirModal(r);
     r.slice(0, 9).forEach(col => {
       const td = document.createElement("td");
       td.textContent = col;
       tr.appendChild(td);
     });
     historyTableBody.appendChild(tr);
     // mobile card
     const card = document.createElement("div");
     card.className = "history-card";
     card.onclick = () => abrirModal(r);
     card.innerHTML = `
<p><strong>ID:</strong> ${r[0]}</p>
<p><strong>Data:</strong> ${r[1]}</p>
<p><strong>Executante:</strong> ${r[2]}</p>
<p><strong>Equipamento:</strong> ${r[4]}</p>
     `;
     mobileHistory.appendChild(card);
   });
}
searchInput.oninput = () => renderHistory(fullHistory);
/* --------------- MODAL --------------- */
function abrirModal(r) {
 registroSelecionado = r;
 modalFields.innerHTML = `
<div class="tech-field"><strong>ID:</strong> ${r[0]}</div>
<div class="tech-field"><strong>Data:</strong> ${r[1]}</div>
<div class="tech-field"><strong>Executante:</strong> ${r[2]}</div>
<div class="tech-field"><strong>Matrícula:</strong> ${r[3]}</div>
<div class="tech-field"><strong>Equipamento:</strong> ${r[4]}</div>
<div class="tech-field"><strong>Acionamento:</strong> ${r[5]}</div>
<div class="tech-field"><strong>Problema:</strong><br>${r[6]}</div>
<div class="tech-field"><strong>Solução:</strong><br>${r[7]}</div>
<div class="tech-field"><strong>Encerramento:</strong> ${r[8]}</div>
 `;
 modalButtons.innerHTML = `<button onclick="fecharModal()" style="background:#2d6a4f;">Fechar</button>`;
 if (matriculaInput.value && matriculaInput.value === String(r[3])) {
   modalButtons.innerHTML += `
<button onclick="editarRegistro()" style="background:#4dabf7;">Editar</button>
<button onclick="deletarRegistro()" style="background:#ff6b6b;">Deletar</button>
   `;
 }
 modalDetalhes.style.display = "flex";
}
function fecharModal() {
 modalDetalhes.style.display = "none";
}
/* --------------- EDITAR --------------- */
function editarRegistro() {
 if (!registroSelecionado) return;
 // preencher formulário com dados existentes
 document.getElementById("nome").value = registroSelecionado[2];
 document.getElementById("matricula").value = registroSelecionado[3];
 // data no formato yyyy-mm-dd para input[type=date]
 const parts = registroSelecionado[1].split("/");
 if (parts.length === 3) document.getElementById("data").value = `${parts[2]}-${parts[1]}-${parts[0]}`;
 document.getElementById("equipamento").value = registroSelecionado[4];
 document.getElementById("acionamento").value = registroSelecionado[5];
 document.getElementById("problema").value = registroSelecionado[6];
 document.getElementById("solucao").value = registroSelecionado[7];
 document.getElementById("encerramento").value = registroSelecionado[8];
 fecharModal();
 alert("Edite os campos no formulário e clique em Registrar para salvar as alterações.");
 // ao submeter, chamará a rota editar (sobrescrevemos temporariamente o onsubmit)
 turnoForm.onsubmit = async (e) => {
   e.preventDefault();
   const payload = {
     nome: document.getElementById("nome").value,
     matricula: document.getElementById("matricula").value,
     data: document.getElementById("data").value,
     equipamento: document.getElementById("equipamento").value,
     acionamento: document.getElementById("acionamento").value,
     problema: document.getElementById("problema").value,
     solucao: document.getElementById("solucao").value,
     encerramento: document.getElementById("encerramento").value
   };
   const resp = await apiPost({ acao: "editarRegistro", id: registroSelecionado[0], payload });
   if (resp && resp.success) {
     alert("Registro atualizado!");
     turnoForm.reset();
     // restaurar handler padrão
     setTimeout(() => { attachTurnoSubmit(); }, 0);
     await loadHistory(matriculaInput.value || null);
     await apiPost({ acao: "registrarLog", matricula: matriculaInput.value, acaoLog: "Editar Registro", info: "ID: " + registroSelecionado[0] });
     logout();
   } else {
     alert("Erro ao atualizar: " + (resp.message || JSON.stringify(resp)));
   }
 };
}
/* --------------- DELETAR --------------- */
async function deletarRegistro() {
 if (!registroSelecionado) return;
 if (!confirm("Tem certeza que deseja deletar este registro?")) return;
 const resp = await apiPost({ acao: "deletarRegistro", id: registroSelecionado[0] });
 if (resp && resp.success) {
   alert("Registro deletado!");
   fecharModal();
   await loadHistory(matriculaInput.value || null);
   await apiPost({ acao: "registrarLog", matricula: matriculaInput.value, acaoLog: "Deletar Registro", info: "ID: " + registroSelecionado[0] });
   logout();
 } else {
   alert("Erro ao deletar: " + (resp.message || JSON.stringify(resp)));
 }
}
/* --------------- NOVO REGISTRO --------------- */
function attachTurnoSubmit() {
 turnoForm.onsubmit = async (e) => {
   e.preventDefault();
   const payload = {
     nome: document.getElementById("nome").value,
     matricula: document.getElementById("matricula").value,
     data: document.getElementById("data").value,
     equipamento: document.getElementById("equipamento").value,
     acionamento: document.getElementById("acionamento").value,
     problema: document.getElementById("problema").value,
     solucao: document.getElementById("solucao").value,
     encerramento: document.getElementById("encerramento").value
   };
   const resp = await apiPost({ acao: "registrarTurno", payload });
   if (resp && resp.success) {
     alert("Registro salvo!");
     turnoForm.reset();
     await loadHistory(matriculaInput.value || null);
     await apiPost({ acao: "registrarLog", matricula: matriculaInput.value, acaoLog: "Novo Registro", info: "ID: " + resp.id });
     logout();
   } else {
     alert("Erro ao salvar: " + (resp.message || JSON.stringify(resp)));
   }
 };
}
attachTurnoSubmit();
/* --------------- WATCHDOG --------------- */
async function atualizarWatchdog() {
 try {
   const r = await apiGet({ acao: "getWatchdog" });
   if (r) {
     watchdogEl.innerText = "Watchdog: " + (r.watchdog || r.message || "");
   } else {
     watchdogEl.innerText = "Watchdog: OFFLINE";
   }
 } catch {
   watchdogEl.innerText = "Watchdog: OFFLINE";
 }
}
setInterval(atualizarWatchdog, 3000);
atualizarWatchdog();
/* --------------- GERAR PDF --------------- */
btnPDF.onclick = async () => {
 try {
   const r = await apiGet({ acao: "gerarPDF" });
   if (r && r.pdf) {
     window.open(r.pdf, "_blank");
   } else {
     alert("Erro ao gerar PDF.");
   }
 } catch (e) {
   alert("Erro ao gerar PDF.");
 }
};
/* --------------- LOG --------------- */
btnLog.onclick = async () => {
 try {
   const d = await apiGet({ acao: "getLog" });
   if (!d || !d.length) {
     alert("Nenhum log registrado.");
     return;
   }
   let texto = "📜 LOG DO SISTEMA:\n\n";
   d.forEach(l => {
     texto += `${l[0]} | Matrícula: ${l[1]} | ${l[2]} | ${l[3]}\n`;
   });
   alert(texto);
 } catch (e) {
   alert("Erro ao carregar log.");
 }
};
/* --------------- Inicializa carregamento público (se usuário já logou anteriormente) --------------- */
loadHistory(); // carrega sem filtro por padrão
