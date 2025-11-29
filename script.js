// URL do seu WebApp publicado no Google Apps Script
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
async function loadHistory(matriculaFiltro = ""){
  const res = await fetch(WEBAPP_URL + "?action=getHistorico&matricula=" + matriculaFiltro);
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
        <p><strong>Executante:</strong> ${r[2]}</p>
        <p><strong>Equipamento:</strong> ${r[4]}</p>
      `;
      m.appendChild(card);
    });
}
searchInput.oninput = ()=>renderHistory(fullHistory);

/* MODAL */
function abrirModal(r){
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
  if (matricula.value && matricula.value === r[3]) {
    modalButtons.innerHTML += `
      <button onclick="editarRegistro()" style="background:#4dabf7;">Editar</button>
      <button onclick="deletarRegistro()" style="background:#ff6b6b;">Deletar</button>
    `;
  }
  modalDetalhes.style.display = "flex";
}
function fecharModal(){ modalDetalhes.style.display="none"; }

/* EDITAR */
async function editarRegistro(){
  if(!registroSelecionado) return;
  nome.value = registroSelecionado[2];
  matricula.value = registroSelecionado[3];
  data.value = registroSelecionado[1].split("/").reverse().join("-");
  equipamento.value = registroSelecionado[4];
  acionamento.value = registroSelecionado[5];
  problema.value = registroSelecionado[6];
  solucao.value = registroSelecionado[7];
  encerramento.value = registroSelecionado[8];

  fecharModal();
  alert("Edite os campos no formulário e clique em Registrar para salvar as alterações.");

  turnoForm.onsubmit = async e=>{
    e.preventDefault();
    const p = {
      id: registroSelecionado[0],
      nome:nome.value,
      matricula:matricula.value,
      data:data.value,
      equipamento:equipamento.value,
      acionamento:acionamento.value,
      problema:problema.value,
      solucao:solucao.value,
      encerramento:encerramento.value
    };
    const res = await fetch(WEBAPP_URL + "?action=editarRegistro", {
      method:"POST",
      body: JSON.stringify(p)
    });
    const r = await res.json();
    if(r.success){
      alert("Registro atualizado!");
      turnoForm.reset();
      loadHistory(matricula.value || null);
    } else alert("Erro: "+r.message);
  };
}

/* DELETAR */
async function deletarRegistro(){
  if(!registroSelecionado) return;
  if(!confirm("Tem certeza que deseja deletar este registro?")) return;

  const res = await fetch(WEBAPP_URL + "?action=deletarRegistro", {
    method:"POST",
    body: JSON.stringify({id: registroSelecionado[0]})
  });
  const r = await res.json();
  if(r.success){
    alert("Registro deletado!");
    fecharModal();
    loadHistory(matricula.value || null);
  } else alert("Erro: "+r.message);
}

/* REGISTRO NOVO */
turnoForm.onsubmit = async e=>{
  e.preventDefault();
  const p = {
    nome:nome.value,
    matricula:matricula.value,
    data:data.value,
    equipamento:equipamento.value,
    acionamento:acionamento.value,
    problema:problema.value,
    solucao:solucao.value,
    encerramento:encerramento.value
  };
  const res = await fetch(WEBAPP_URL + "?action=registrarTurno", {
    method:"POST",
    body: JSON.stringify(p)
  });
  const r = await res.json();
  if(r.success){
    alert("Registro salvo!");
    turnoForm.reset();
    loadHistory(matricula.value || null);
  } else alert("Erro: "+r.message);
};

/* WATCHDOG */
async function atualizarWatchdog(){
  try {
    const res = await fetch(WEBAPP_URL + "?action=getWatchdog");
    const r = await res.json();
    watchdogEl.innerText = "Watchdog: " + r.watchdog;
  } catch {
    watchdogEl.innerText = "Watchdog: OFFLINE";
  }
}
setInterval(atualizarWatchdog,3000);
atualizarWatchdog();

/* GERAR PDF */
btnPDF.onclick = async ()=>{
  const res = await fetch(WEBAPP_URL + "?action=gerarPDF");
  const r = await res.json();
  if(r.url) window.open(r.url,"_blank");
};

/* INICIALIZA */
loadHistory();
