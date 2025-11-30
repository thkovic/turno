// Constants
const PLANILHA_ID = "1-ItoHJi0JC0CCfXBB6aNGyDws7e6LJxKi8uZPRtLRZY";
const ABA = "Registro";
const ABA_LOG = "Log";

/* ------------------------------------------------------
   GET HTML
------------------------------------------------------ */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Sistema de Histórico")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ------------------------------------------------------
   WATCHDOG
------------------------------------------------------ */
function getWatchdog() {
  return {
    status: "ok",
    watchdog: new Date().toLocaleTimeString("pt-BR"),
    timestamp: new Date().toISOString()
  };
}

/* ------------------------------------------------------
   SETUP
------------------------------------------------------ */
function setupSheet() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let sh = ss.getSheetByName(ABA);

  if (!sh) sh = ss.insertSheet(ABA);

  const headers = [
    "ID","Data","Executante","Matrícula","Equipamento",
    "Acionamento","Problema","Solução","Encerramento"
  ];

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.autoResizeColumns(1, headers.length);
}

function setupLogSheet() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let sh = ss.getSheetByName(ABA_LOG);

  if (!sh) {
    sh = ss.insertSheet(ABA_LOG);
    const headers = ["Data/Hora", "Matrícula", "Ação", "Detalhes"]; 
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.autoResizeColumns(1, headers.length);
  }
  return sh;
}

function setupConfigSheet() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let sh = ss.getSheetByName("Config");

  if (!sh) {
    sh = ss.insertSheet("Config");
    sh.getRange(1, 1).setValue("UltimoID");
    sh.getRange(2, 1).setValue(0);
  }
  return sh;
}

function getNextId() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const sh = ss.getSheetByName("Config") || setupConfigSheet();

  let ultimoId = sh.getRange(2, 1).getValue();
  if (!ultimoId || isNaN(ultimoId)) ultimoId = 0;

  const novoId = Number(ultimoId) + 1;
  sh.getRange(2, 1).setValue(novoId);

  return novoId;
}

/* ------------------------------------------------------
   REGISTRAR LOG
------------------------------------------------------ */
function registrarLog(matricula, acao, detalhes = "") {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    let sh = ss.getSheetByName(ABA_LOG);

    if (!sh) sh = setupLogSheet();

    const linha = [
      new Date().toLocaleString("pt-BR"),
      matricula ? matricula.toString().trim() : "",
      acao,
      detalhes
    ];

    sh.appendRow(linha);
  } catch (e) {
    Logger.log("Erro registrarLog: " + e);
  }
}

/* ------------------------------------------------------
   RETORNAR LOG (para UI)
------------------------------------------------------ */
function getLog() {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA_LOG);
    if (!sh) return [];

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return [];

    const data = sh.getRange(2, 1, lastRow - 1, 4).getValues();
    return data;
  } catch (e) {
    Logger.log("Erro getLog: " + e);
    return [];
  }
}

/* ------------------------------------------------------
   REGISTRAR
------------------------------------------------------ */
function registrarTurno(payload) {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);

    if (!sh) return { success: false, message: "Aba não encontrada" };

    const id = getNextId();

    const linha = [
      id,
      formatDateDDMMYYYY(payload.data),
      payload.nome,
      payload.matricula ? payload.matricula.toString().trim() : "",
      payload.equipamento,
      formatHora(payload.acionamento),
      payload.problema,
      payload.solucao,
      formatHora(payload.encerramento)
    ];

    sh.appendRow(linha);

    registrarLog(
      payload.matricula,
      "Novo Registro",
      "ID: " + id + "\nDADOS: " + linha.join(" | ")
    );

    return { success: true, message: "Registro salvo com sucesso!", id: id };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/* ------------------------------------------------------
   HISTÓRICO
------------------------------------------------------ */
function getHistorico(matricula = null) {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);

    if (!sh) return [];

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return [];

    let data = sh
      .getRange(2, 1, lastRow - 1, 9)
      .getValues()
      .map(row => [
        row[0],
        formatDateDDMMYYYY(row[1]),
        row[2],
        row[3] ? row[3].toString().trim() : "",
        row[4],
        formatHora(row[5]),
        row[6],
        row[7],
        formatHora(row[8])
      ]);

    if (matricula) {
      data = data.filter(
        r => r[3].toString().trim() === matricula.toString().trim()
      );
    }

    return data;
  } catch (e) {
    Logger.log("Erro getHistorico: " + e);
    return [];
  }
}

/* ------------------------------------------------------
   EDITAR
------------------------------------------------------ */
function editarRegistro(id, payload) {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);

    const lastRow = sh.getLastRow();
    const ids = sh
      .getRange(2, 1, lastRow - 1, 1)
      .getValues()
      .flat()
      .map(v => Number(v));

    const idx = ids.indexOf(Number(id));
    if (idx === -1)
      return { success: false, message: "ID não encontrado" };

    const row = idx + 2;
    const dadosAntigos = sh.getRange(row, 1, 1, 9).getValues()[0];

    const linhaNova = [
      Number(id),
      formatDateDDMMYYYY(payload.data),
      payload.nome,
      payload.matricula ? payload.matricula.toString().trim() : "",
      payload.equipamento,
      formatHora(payload.acionamento),
      payload.problema,
      payload.solucao,
      formatHora(payload.encerramento)
    ];

    sh.getRange(row, 1, 1, linhaNova.length).setValues([linhaNova]);

    registrarLog(
      payload.matricula,
      "Editar Registro",
      `ID: ${id}\nANTES: ${dadosAntigos.join(" | ")}\nDEPOIS: ${linhaNova.join(" | ")}`
    );

    return { success: true, message: "Registro atualizado" };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/* ------------------------------------------------------
   DELETAR
------------------------------------------------------ */
function deletarRegistro(id) {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);

    const lastRow = sh.getLastRow();
    const ids = sh
      .getRange(2, 1, lastRow - 1, 1)
      .getValues()
      .flat()
      .map(v => Number(v));

    const idx = ids.indexOf(Number(id));
    if (idx === -1)
      return { success: false, message: "ID não encontrado" };

    const row = idx + 2;
    const dadosAntigos = sh.getRange(row, 1, 1, 9).getValues()[0];
    const matricula = dadosAntigos[3] ? dadosAntigos[3].toString().trim() : "";

    sh.deleteRow(row);

    registrarLog(
      matricula,
      "Deletar Registro",
      `ID: ${id}\nANTES: ${dadosAntigos.join(" | ")}`
    );

    return { success: true, message: "Registro deletado" };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/* ------------------------------------------------------
   PDF
------------------------------------------------------ */
function gerarPDF(filtro = null) {
  try {
    let data = getHistorico();

    if (filtro && filtro.campo >= 0 && filtro.campo < 9) {
      data = data.filter(r =>
        r[filtro.campo].toString().toLowerCase().includes(filtro.valor.toLowerCase())
      );
    }

    if (!data.length) throw "Sem registros para gerar PDF";

    let html = `
      <h2>Histórico de Registros</h2>
      <table border="1" cellspacing="0" cellpadding="4">
        <tr>
          <th>ID</th><th>Data</th><th>Executante</th><th>Matrícula</th>
          <th>Equipamento</th><th>Acionamento</th><th>Problema</th>
          <th>Solução</th><th>Encerramento</th>
        </tr>
    `;

    data.forEach(r => {
      html +=
        "<tr>" +
        r.map(c => `<td>${c}</td>`).join("") +
        "</tr>";
    });

    html += "</table>";

    const blob = Utilities.newBlob(html, "text/html", "historico.html");
    const pdf = blob.getAs("application/pdf").setName("Historico.pdf");
    const file = DriveApp.createFile(pdf);
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);

    return file.getUrl();
  } catch (e) {
    throw e;
  }
}

/* ------------------------------------------------------
   BACKUP
------------------------------------------------------ */
function backupPlanilha() {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const file = DriveApp.getFileById(PLANILHA_ID);

    const nomeBackup = `Backup_${ss.getName()}_${new Date().toLocaleDateString("pt-BR")}`;

    file.makeCopy(
      nomeBackup,
      DriveApp.getFolderById(file.getParents().next().getId())
    );

    registrarLog(
      "SYSTEM",
      "Backup Automático",
      `Backup criado: ${nomeBackup}`
    );
  } catch (e) {
    Logger.log("Erro no backup: " + e);
  }
}

/* ------------------------------------------------------
   FUNÇÕES AUXILIARES
------------------------------------------------------ */
function formatDateDDMMYYYY(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    const dia = ("0" + value.getDate()).slice(-2);
    const mes = ("0" + (value.getMonth() + 1)).slice(-2);
    const ano = value.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  if (typeof value === "string" && value.includes("-")) {
    const parts = value.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value.toString();
}

function formatHora(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    const hora = ("0" + value.getHours()).slice(-2);
    const min = ("0" + value.getMinutes()).slice(-2);
    return `${hora}:${min}`;
  }

  return value.toString();
}

/* ------------------------------------------------------
   AUTO SETUP
------------------------------------------------------ */
function onOpen() {
  setupSheet();
  setupLogSheet();
  setupConfigSheet();
}

function onInstall() {
  setupSheet();
  setupLogSheet();
  setupConfigSheet();
}
