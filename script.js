const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyjN_7typwQ8yFu-4CW6uRV9U4U6z1386BcGz3YAl_-di_KXedC2FFg3NEAIDjuL4ir/exec";

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

let fullHistory = [];
let registroSelecionado = null;

/* LOGIN */
loginForm.onsubmit = async e=>{
  e.preventDefault();
  const mat = document.getElementById("loginMatricula").value;
  loginDiv.style.display="none";
  registroDiv.style.display="block";
  matricula.value = mat;
  await loadHistory(mat);
};

/* LOGOUT */
function logout(){
  registroDiv.style.display = "none";
  loginDiv.style.display = "block";
  turnoForm.reset();
  matricula.value = "";
  loadHistory();
}

/* CARREGAR HISTÓRICO */
async function loadHistory(matriculaFiltro = null){
  const res = await fetch(WEBAPP_URL + "?action=getHistorico&matricula=" + (matriculaFiltro||""));
  const d = await res.json();
  fullHistory = d || [];
  renderHistory(fullHistory);
}

function renderHistory(data){
  const t = document.querySelector("#historyTable tbody");
  const m = document.getElementById("mobileHistory");
  t.innerHTML=""; m.innerHTML="";
  if(!data.length){
    t.innerHTML='<tr><td colspan="9">Sem registros</td></tr>';
    m.innerHTML='<p style="text-align:center;color:#888;">Sem registros</p>';
    return;
  }
  const searchTerm = searchInput.value.toLowerCase();
  data.filter(r=>r.some(c=>c.toString().toLowerCase().includes(searchTerm)))
    .forEach(r=>{
      let tr = document.createElement("tr");
      tr.onclick = ()=>abrirModal(r);
      r.slice(0,9).forEach(col=>{
        let td = document.createElement("td");
        td.textContent = col;
        tr.appendChild(td);
      });
      t.appendChild(tr);

      let card = document.createElement("div");
      card.className = "history-card";
      card.onclick = ()=>abrirModal(r);
      card.innerHTML = `
        <p><strong>ID:</strong> ${r[0]}</p>
        <p><strong>Data:</strong> ${r[1]}</p>
        <
