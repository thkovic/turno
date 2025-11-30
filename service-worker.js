// URL do Apps Script WebApp

const API_URL = "https://script.google.com/macros/s/AKfycbyjN_7typwQ8yFu-4CW6uRV9U4U6z1386BcGz3YAl_-di_KXedC2FFg3NEAIDjuL4ir/exec";

/* ---------------------- GET ---------------------- */

async function apiGet(params = {}) {

    const url = new URL(API_URL);

    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));

    const response = await fetch(url, { method: "GET" });

    return response.json();

}

/* ======================================================

  HISTÓRICO

====================================================== */

async function carregarHistorico() {

    try {

        const matricula = localStorage.getItem("matricula") || "";

        const dados = await apiGet({

            acao: "getHistorico",

            matricula: matricula

        });

        console.log("Retorno do Apps Script (Histórico):", dados);

        const tabela = document.getElementById("tabela-registros");

        tabela.innerHTML = "";

        if (!dados || dados.length === 0) {

            tabela.innerHTML = `<tr><td colspan="9">Sem registros encontrados</td></tr>`;

            return;

        }

        dados.forEach(linha => {

            tabela.innerHTML += `
<tr>
<td>${linha[0]}</td>
<td>${linha[1]}</td>
<td>${linha[2]}</td>
<td>${linha[3]}</td>
<td>${linha[4]}</td>
<td>${linha[5]}</td>
<td>${linha[6]}</td>
<td>${linha[7]}</td>
<td>${linha[8]}</td>
</tr>`;

        });

    } catch (e) {

        console.error("Erro carregarHistorico:", e);

        alert("Erro ao carregar histórico");

    }

}
 
