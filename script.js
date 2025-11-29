// URL do seu WebApp publicado no Google Apps Script
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyjN_7typwQ8yFu-4CW6uRV9U4U6z1386BcGz3YAl_-di_KXedC2FFg3NEAIDjuL4ir/exe";

let fullHistory = [];
let registroSelecionado = null;

/* CARREGAR HISTÓRICO */
async function loadHistory(matriculaFiltro = ""){
  const res = await fetch(WEBAPP_URL + "?action=getHistorico&matricula=" + matriculaFiltro);
  const d = await res.json();
  fullHistory = d || [];
  renderHistory(fullHistory);
}

/* RENDERIZAÇÃO EM TIMELINE */
function renderHistory(data){
  const timeline = document.getElementById("historyTimeline");
  timeline.innerHTML = "";

  if(!data.length){
    timeline.innerHTML = '<p style="text-align:center;color:#888;">Sem registros</p>';
    return;
  }

  data.forEach(r=>{
    let card = document.createElement("div");
    card.className = "timeline-item";
    card.onclick = ()=>abrirModal(r);
    card.innerHTML = `
      <div class="timeline-date">${r[1]} | ${r[5]} → ${r[8]}</div>
      <div class="timeline-content">
        <h3>${r[2]} (Matrícula ${r[3]})</h3>
        <p><strong>Equipamento:</strong> ${r[4]}</p>
        <p><strong>Problema:</strong> ${r[6]}</p>
        <p><strong>Solução:</strong> ${r[7]}</p>
      </div>
    `;
    timeline.appendChild(card);
  });
}

/* MODAL */
function abrirModal(r){
  registroSelecionado = r;
  const modal = document.getElementById("modalDetalhes");
  const fields = document.getElementById("modalFields");
  const buttons = document.getElementById("modalButtons");

  fields.innerHTML = `
    <p><strong>ID:</strong> ${r[0]}</p>
    <p><strong>Data:</strong> ${r[1]}</p>
    <p><strong>Executante:</strong> ${r[2]}</p>
    <p><strong>Matrícula:</strong> ${r[3]}</p>
    <p><strong>Equipamento:</strong> ${r[4]}</p>
    <p><strong>Acionamento:</strong> ${r[5]}</p>
    <p><strong>Problema:</strong> ${r[6]}</p>
    <p><strong>Solução:</strong> ${r[7]}</p>
    <p><strong>Encerramento:</strong> ${r[8]}</p>
  `;
  buttons.innerHTML = `<button onclick="fecharModal()">Fechar</button>`;
  modal.style.display = "block";
}
function fecharModal(){
  document.getElementById("modalDetalhes").style.display = "none";
}

/* INICIALIZA */
loadHistory();
