// Constants
const PLANILHA_ID = "1-ItoHJi0JC0CCfXBB6aNGyDws7e6LJxKi8uZPRtLRZY";
const ABA = "Registro";
const ABA_LOG = "Log";
const SHEET_CONFIG = "Config";

/* ------------------------------------------------------
   doGet: serve UI ou endpoints JSON/JSONP (apenas GET)
   Ex.: /exec?action=historico&matricula=123&callback=handleHistorico
------------------------------------------------------ */
function doGet(e) {
  try {
    // Se action presente => API GET (JSON ou JSONP)
    if (e && e.parameter && e.parameter.action) {
      const action = String(e.parameter.action);
      const callback = e.parameter.callback;
      const matricula = e.parameter.matricula || null;
      const campo = e.parameter.campo;
      const valor = e.parameter.valor;

      let payload;
      if (action === "historico") {
        payload = getHistorico(matricula);
      } else if (action === "watchdog") {
        payload = getWatchdog();
      } else if (action === "log") {
        payload = getLog();
      } else if (action === "ping") {
        payload = { status: "ok", now: new Date().toISOString() };
      } else if (action === "gerarPDF") {
        const filtro = (typeof campo !== "undefined" && typeof valor !== "undefined") ? { campo: Number(campo), valor: valor } : null;
        payload = { url: gerarPDF(filtro) };
      } else {
        payload = { error: "action desconhecida" };
      }

      const json = JSON.stringify(payload || {});

      if (callback) {
        // JSONP response
        const body = callback + "(" + json + ");";
        return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        // Plain JSON
        return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Senão, serve o HTML (UI)
    return HtmlService.createHtmlOutputFromFile("index").setTitle("Sistema de Histórico").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    Logger.log("doGet error: " + err);
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/* ------------------------------------------------------
   doPost: endpoints para escrita (registrar, editar, deletar)
   Recebe JSON no body: { action: "registrar", payload: { ... } }
   OBS: chamadas POST vindas de outro domínio exigem CORS/proxy.
------------------------------------------------------ */
function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : null;
    if (!raw) return jsonResponse({ success: false, message: "Sem corpo na requisição" });

    const body = JSON.parse(raw);
    const action = body.action;
    const payload = body.payload || {};

    if (action === "registrar") {
      return jsonResponse(registrarTurno(payload));
    } else if (action === "editar") {
      return jsonResponse(editarRegistro(payload.id, payload));
    } else if (action === "deletar") {
      return jsonResponse(deletarRegistro(payload.id));
    } else if (action === "registrarLog") {
      // opcional: permitir registro de logs via POST
      registrarLog(payload.matricula, payload.acao || "acao", payload.detalhes || "");
      return jsonResponse({ success: true });
    } else {
      return jsonResponse({ success: false, message: "action POST desconhecida" });
    }
  } catch (err) {
    Logger.log("doPost error: " + err);
    return jsonResponse({ success: false, message: err.toString() });
  }
}

/* ------------------------------------------------------
   HELPER: resposta JSON padrão
------------------------------------------------------ */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------
   Funções principais (Sheets)
------------------------------------------------------ */
function setupSheetIfNeeded() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  if (!ss.getSheetByName(ABA)) {
    const sh = ss.insertSheet(ABA);
    const headers = ["ID","Data","Executante","Matrícula","Equipamento","Acionamento","Problema","Solução","Encerramento"];
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.autoResizeColumns(1, headers.length);
  }
  if (!ss.getSheetByName(ABA_LOG)) {
    const sh = ss.insertSheet(ABA_LOG);
    const headers = ["Data/Hora", "Matrícula", "Ação", "Detalhes"];
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.autoResizeColumns(1, headers.length);
  }
  if (!ss.getSheetByName(SHEET_CONFIG)) {
    const sh = ss.insertSheet(SHEET_CONFIG);
    sh.getRange(1,1).setValue("UltimoID");
    sh.getRange(2,1).setValue(0);
  }
}

function getNextId() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let sh = ss.getSheetByName(SHEET_CONFIG);
  if (!sh) sh = setupConfigSheet();
  let ultimo = sh.getRange(2,1).getValue();
  if (!ultimo || isNaN(ultimo)) ultimo = 0;
  const novo = Number(ultimo) + 1;
  sh.getRange(2,1).setValue(novo);
  return novo;
}

function setupConfigSheet() {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let sh = ss.getSheetByName(SHEET_CONFIG);
  if (!sh) {
    sh = ss.insertSheet(SHEET_CONFIG);
    sh.getRange(1,1).setValue("UltimoID");
    sh.getRange(2,1).setValue(0);
  }
  return sh;
}

/* ------------------------------------------------------
   Registro / edição / exclusão
------------------------------------------------------ */
function registrarTurno(payload) {
  try {
    setupSheetIfNeeded();
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);
    if (!sh) return { success: false, message: "Aba não encontrada" };

    const id = getNextId();

    const linha = [
      id,
      formatDateDDMMYYYY(payload.data),
      payload.nome || "",
      payload.matricula ? payload.matricula.toString().trim() : "",
      payload.equipamento || "",
      formatHora(payload.acionamento),
      payload.problema || "",
      payload.solucao || "",
      formatHora(payload.encerramento)
    ];
    sh.appendRow(linha);

    registrarLog(payload.matricula, "Novo Registro", "ID: " + id + " | " + linha.join(" | "));
    return { success: true, message: "Registro salvo", id: id };
  } catch (err) {
    Logger.log("registrarTurno error: " + err);
    return { success: false, message: err.toString() };
  }
}

function editarRegistro(id, payload) {
  try {
    setupSheetIfNeeded();
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);
    if (!sh) return { success: false, message: "Aba não encontrada" };

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: false, message: "Nenhum registro" };

    const ids = sh.getRange(2,1,lastRow-1,1).getValues().flat().map(Number);
    const idx = ids.indexOf(Number(id));
    if (idx === -1) return { success: false, message: "ID não encontrado" };

    const row = idx + 2;
    const antes = sh.getRange(row,1,1,9).getValues()[0];

    const nova = [
      Number(id),
      formatDateDDMMYYYY(payload.data),
      payload.nome || "",
      payload.matricula ? payload.matricula.toString().trim() : "",
      payload.equipamento || "",
      formatHora(payload.acionamento),
      payload.problema || "",
      payload.solucao || "",
      formatHora(payload.encerramento)
    ];
    sh.getRange(row,1,1,nova.length).setValues([nova]);
    registrarLog(payload.matricula, "Editar Registro", "ID: " + id + "\nANTES: " + antes.join(" | ") + "\nDEPOIS: " + nova.join(" | "));
    return { success: true, message: "Registro atualizado" };
  } catch (err) {
    Logger.log("editarRegistro error: " + err);
    return { success: false, message: err.toString() };
  }
}

function deletarRegistro(id) {
  try {
    setupSheetIfNeeded();
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);
    if (!sh) return { success: false, message: "Aba não encontrada" };

    const lastRow = sh.getLastRow();
    const ids = sh.getRange(2,1,lastRow-1,1).getValues().flat().map(Number);
    const idx = ids.indexOf(Number(id));
    if (idx === -1) return { success: false, message: "ID não encontrado" };

    const row = idx + 2;
    const antes = sh.getRange(row,1,1,9).getValues()[0];
    const matricula = antes[3] ? antes[3].toString().trim() : "";
    sh.deleteRow(row);
    registrarLog(matricula, "Deletar Registro", "ID: " + id + " | ANTES: " + antes.join(" | "));
    return { success: true, message: "Registro deletado" };
  } catch (err) {
    Logger.log("deletarRegistro error: " + err);
    return { success: false, message: err.toString() };
  }
}

/* ------------------------------------------------------
   Histórico / Log / PDF
------------------------------------------------------ */
function getHistorico(matricula = null) {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA);
    if (!sh) return [];

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return [];

    const rows = sh.getRange(2,1,lastRow-1,9).getValues();
    let data = rows.map(row => [
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
      data = data.filter(r => r[3].toString().trim() === matricula.toString().trim());
    }
    return data;
  } catch (err) {
    Logger.log("getHistorico error: " + err);
    return [];
  }
}

function getLog() {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA_LOG);
    if (!sh) return [];
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return [];
    return sh.getRange(2,1,lastRow-1,4).getValues();
  } catch (err) {
    Logger.log("getLog error: " + err);
    return [];
  }
}

function gerarPDF(filtro = null) {
  try {
    const data = getHistorico();
    const filtered = (filtro && typeof filtro.campo === "number" && filtro.campo >= 0 && filtro.campo < 9)
      ? data.filter(r => r[filtro.campo].toString().toLowerCase().indexOf(String(filtro.valor).toLowerCase()) !== -1)
      : data;
    if (!filtered.length) throw "Sem registros para gerar PDF";
    let html = '<h2>Histórico de Registros</h2><table border="1" cellspacing="0" cellpadding="4"><tr><th>ID</th><th>Data</th><th>Executante</th><th>Matrícula</th><th>Equipamento</th><th>Acionamento</th><th>Problema</th><th>Solução</th><th>Encerramento</th></tr>';
    filtered.forEach(r => {
      html += '<tr>' + r.map(c => '<td>' + (c !== undefined ? c : '') + '</td>').join('') + '</tr>';
    });
    html += '</table>';
    const blob = Utilities.newBlob(html, 'text/html', 'historico.html');
    const pdf = blob.getAs('application/pdf').setName('Historico.pdf');
    const file = DriveApp.createFile(pdf);
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    registrarLog("SYSTEM", "Gerar PDF", "PDF criado: " + file.getUrl());
    return file.getUrl();
  } catch (err) {
    Logger.log("gerarPDF error: " + err);
    throw err;
  }
}

/* ------------------------------------------------------
   registrarLog e utilitários
------------------------------------------------------ */
function registrarLog(matricula, acao, detalhes) {
  try {
    setupSheetIfNeeded();
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const sh = ss.getSheetByName(ABA_LOG);
    const linha = [ new Date().toLocaleString("pt-BR"), matricula ? matricula.toString().trim() : "", acao || "", detalhes || "" ];
    sh.appendRow(linha);
  } catch (err) {
    Logger.log("registrarLog error: " + err);
  }
}

function formatDateDDMMYYYY(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    const dia = ("0" + value.getDate()).slice(-2);
    const mes = ("0" + (value.getMonth()+1)).slice(-2);
    const ano = value.getFullYear();
    return dia + "/" + mes + "/" + ano;
  }
  if (typeof value === "string" && value.indexOf("-") !== -1) {
    const parts = value.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  return String(value);
}

function formatHora(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    const h = ("0" + value.getHours()).slice(-2);
    const m = ("0" + value.getMinutes()).slice(-2);
    return h + ":" + m;
  }
  return String(value);
}

/* ------------------------------------------------------
   Auto-setup
------------------------------------------------------ */
function onOpen() {
  setupSheetIfNeeded();
}
function onInstall() {
  setupSheetIfNeeded();
}
