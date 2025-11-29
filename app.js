// ===============================
// CONFIGURAÇÃO
// ===============================
const API_URL = "https://script.google.com/macros/s/AKfycbyjN_7typwQ8yFu-4CW6uRV9U4U6z1386BcGz3YAl_-di_KXedC2FFg3NEAIDjuL4ir/exec";

// ===============================
// HELPERS
// ===============================
async function apiGet(params = {}) {
   const url = new URL(API_URL);
   Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
   const resp = await fetch(url, { method: "GET" });
   return resp.json();
}
async function apiPost(body = {}) {
   const resp = await fetch(API_URL, {
       method: "POST",
       mode: "cors",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(body)
   });
   return resp.json();
}

// ===============================
// LOGIN
// ===============================
async function fazerLogin() {
   const nome = document.getElementById("login-nome").value.trim();
   const mat = document.getElementById("login-matricula").value.trim();
   if (!nome || !mat) {
       alert("Preencha nome e matrícula.");
       return;
   }
   localStorage.setItem("usuarioNome", nome);
   localStorage.setItem("usuarioMatricula", mat);
   document.getElementById("login-container").classList.add("hidden");
   document.getElementById("app-container").classList.remove("hidden");
   carregarTabela();
   carregarLog();
   verificarWatchdog();
}

// ===============================
// CARREGAR HISTÓRICO
// ===============================
async function carregarTabela() {
   const tabela = document.getElementById("tabela-registros");
   tabela.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;
   try {
       const dados = await apiGet({
           acao: "getHistorico",
           matricula: localStorage.getItem("usuarioMatricula")
       });
       tabela.innerHTML = "";
       dados.forEach(item => {
           const tr = document.createElement("tr");
           tr.innerHTML = `
<td>${item.data}</td>
<td>${item.turno}</td>
<td>${item.setor}</td>
<td>${item.descricao}</td>
<td>${item.usuario}</td>
<td>
<button onclick="abrirEdicao('${item.id}')">Editar</button>
<button onclick="deletarRegistro('${item.id}')">Excluir</button>
</td>
           `;
           tabela.appendChild(tr);
       });
   } catch (e) {
       tabela.innerHTML = `<tr><td colspan="6">Erro ao carregar.</td></tr>`;
   }
}

// ===============================
// REGISTRAR NOVO TURNO
// ===============================
async function registrarTurno() {
   const data = document.getElementById("reg-data").value;
   const turno = document.getElementById("reg-turno").value;
   const setor = document.getElementById("reg-setor").value;
   const desc = document.getElementById("reg-desc").value;
   if (!data || !turno || !setor || !desc) {
       alert("Preencha tudo.");
       return;
   }
   const resp = await apiPost({
       acao: "registrarTurno",
       data, turno, setor, desc,
       usuario: localStorage.getItem("usuarioNome"),
       matricula: localStorage.getItem("usuarioMatricula")
   });
   alert(resp.message || "Registrado.");
   carregarTabela();
   carregarLog();
}

// ===============================
// EDITAR REGISTRO
// ===============================
let idEdicao = null;
function abrirEdicao(id) {
   idEdicao = id;
   document.getElementById("modal-edicao").classList.remove("hidden");
}
async function salvarEdicao() {
   const novoTexto = document.getElementById("edit-desc").value;
   const resp = await apiPost({
       acao: "editarRegistro",
       id: idEdicao,
       descricao: novoTexto,
       usuario: localStorage.getItem("usuarioNome"),
       matricula: localStorage.getItem("usuarioMatricula")
   });
   alert(resp.message);
   document.getElementById("modal-edicao").classList.add("hidden");
   carregarTabela();
   carregarLog();
}

// ===============================
// DELETAR REGISTRO
// ===============================
async function deletarRegistro(id) {
   if (!confirm("Tem certeza?")) return;
   const resp = await apiPost({
       acao: "deletarRegistro",
       id,
       usuario: localStorage.getItem("usuarioNome"),
       matricula: localStorage.getItem("usuarioMatricula")
   });
   alert(resp.message);
   carregarTabela();
   carregarLog();
}

// ===============================
// CARREGAR LOG
// ===============================
async function carregarLog() {
   const tabela = document.getElementById("tabela-log");
   tabela.innerHTML = `<tr><td colspan="4">Carregando...</td></tr>`;
   const dados = await apiGet({ acao: "getLog" });
   tabela.innerHTML = "";
   dados.forEach(item => {
       const tr = document.createElement("tr");
       tr.innerHTML = `
<td>${item.data}</td>
<td>${item.acao}</td>
<td>${item.usuario}</td>
<td>${item.detalhes}</td>
       `;
       tabela.appendChild(tr);
   });
}

// ===============================
// WATCHDOG
// ===============================
async function verificarWatchdog() {
   const wd = document.getElementById("watchdog");
   try {
       const dados = await apiGet({ acao: "getWatchdog" });
       wd.textContent = dados.message;
       wd.style.color = dados.watchdog === 1 ? "green" : "red";
   } catch {
       wd.textContent = "Erro de comunicação";
       wd.style.color = "red";
   }
}

// ===============================
// GERAR PDF
// ===============================
async function gerarPDF() {
   const resp = await apiGet({ acao: "gerarPDF" });
   if (resp.pdf) {
       window.open(resp.pdf, "_blank");
   } else {
       alert("Erro ao gerar PDF.");
   }
}
