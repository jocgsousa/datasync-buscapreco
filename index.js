require('dotenv/config');
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const mysql = require('mysql2/promise');
const schedule = require('node-schedule');

// Configuração do Oracle Instant Client
const oracleClientPath = path.resolve(__dirname, 'instantclient_19_25');
oracledb.initOracleClient({ libDir: oracleClientPath });

// Função para registrar logs no arquivo
function writeLog(message) {
  const logFilePath = path.resolve(__dirname, 'sync_log.txt');
  const timestamp = new Date().toLocaleString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

// Função principal de sincronização
async function syncData() {
  let oracleConnection;
  let mysqlConnection;
  const startTime = new Date();

  writeLog('Sincronização iniciada.');

  let updatedCount = 0;
  let insertedCount = 0;

  try {
    // Conexão com o Oracle
    oracleConnection = await oracledb.getConnection({
      user: process.env.LCDBUSER,
      password: process.env.LCDBPASS,
      connectString: `${process.env.LCDBHOST}/${process.env.LCDBNAME}`
    });
    console.log('Conectado ao Oracle DB.');

    // Executar a consulta no Oracle para obter produtos
    const result = await oracleConnection.execute(
      `SELECT 
         PCEMBALAGEM.CODPROD,
         PCEMBALAGEM.CODAUXILIAR,
         PCPRODUT.DESCRICAO,
         PCEMBALAGEM.PVENDA
       FROM PCEMBALAGEM 
       INNER JOIN PCPRODUT 
       ON PCPRODUT.CODPROD = PCEMBALAGEM.CODPROD 
       WHERE PCEMBALAGEM.CODFILIAL = 1 AND PCEMBALAGEM.PVENDA IS NOT NULL`
    );
    console.log(`Consulta ao Oracle retornou ${result.rows.length} registros.`);

    // Conexão com o MySQL
    mysqlConnection = await mysql.createConnection({
      host: process.env.EXDBHOST,
      user: process.env.EXDBUSER,
      password: process.env.EXDBPASS,
      database: process.env.EXDBNAME
    });
    console.log('Conectado ao MySQL.');

    // Inserir ou atualizar os dados no MySQL
    const selectQuery = `SELECT * FROM produtos WHERE codauxiliar = ?`;
    const insertQuery = `
      INSERT INTO produtos (codprod, codauxiliar, descricao, pvenda, descontofidelidade, pvendafidelidade, dtfinalfidelidade, oferta_filial_2, oferta_filial_3, oferta_filial_4, oferta_filial_5, oferta_filial_6, oferta_filial_7, oferta_filiais_offers) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const updateQuery = `
      UPDATE produtos 
      SET descricao = ?, pvenda = ?, descontofidelidade = ?, pvendafidelidade = ?, dtfinalfidelidade = ?, oferta_filial_2 = ?, oferta_filial_3 = ? , oferta_filial_4 = ?, oferta_filial_5 = ?, oferta_filial_6 = ?, oferta_filial_7 = ?, oferta_filiais_offers = ? 
      WHERE codauxiliar = ?
    `;

    for (const row of result.rows) {
      const [codprod, codauxiliar, descricao, pvenda] = row;

      // Consultar desconto fidelidade no Oracle usando o script fornecido
      const descontoResult = await oracleConnection.execute(
        `SELECT
           NVL(PCDESCONTOFIDELIDADE.PERCDESCONTO, 2) AS DESCONTO,
           ROUND(NVL(PCEMBALAGEM.PVENDA, 0) * (1 - (PCDESCONTOFIDELIDADE.PERCDESCONTO / 100)), 2) AS VALOR_FINAL,
           PCDESCONTOFIDELIDADE.DTFINAL AS DTFINAL,
           CASE
        -- Descontos fidelidades com apenas o fornecedor informado
        WHEN PCDESCONTOFIDELIDADE.CODFORNEC = PCPRODUT.CODFORNEC
            AND PCDESCONTOFIDELIDADE.CODPROD IS NULL
            AND PCDESCONTOFIDELIDADE.CODEPTO IS NULL
            AND PCDESCONTOFIDELIDADE.CODSEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODSUBCATEGORIA IS NULL
            AND PCDESCONTOFIDELIDADE.CODCATEGORIA IS NULL THEN 12 -- Descontos fidelidades com apenas o código do produto informado
        WHEN PCDESCONTOFIDELIDADE.CODPROD = PCPRODUT.CODPROD
            AND PCDESCONTOFIDELIDADE.CODFORNEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODEPTO IS NULL
            AND PCDESCONTOFIDELIDADE.CODSEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODSUBCATEGORIA IS NULL
            AND PCDESCONTOFIDELIDADE.CODCATEGORIA IS NULL THEN 12 -- Descontos fidelidades com apenas o código do departamento informado
        WHEN PCDESCONTOFIDELIDADE.CODEPTO = PCPRODUT.CODEPTO
            AND PCDESCONTOFIDELIDADE.CODFORNEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODPROD IS NULL
            AND PCDESCONTOFIDELIDADE.CODSEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODSUBCATEGORIA IS NULL
            AND PCDESCONTOFIDELIDADE.CODCATEGORIA IS NULL THEN 11 -- Descontos fidelidades com apenas o código da seção informado
        WHEN PCDESCONTOFIDELIDADE.CODSEC = PCPRODUT.CODSEC
            AND PCDESCONTOFIDELIDADE.CODFORNEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODPROD IS NULL
            AND PCDESCONTOFIDELIDADE.CODEPTO IS NULL
            AND PCDESCONTOFIDELIDADE.CODSUBCATEGORIA IS NULL
            AND PCDESCONTOFIDELIDADE.CODCATEGORIA IS NULL THEN 10 -- Descontos fidelidades com apenas o código da subcategoria informado
        WHEN PCDESCONTOFIDELIDADE.CODSUBCATEGORIA = PCPRODUT.CODSUBCATEGORIA
            AND PCDESCONTOFIDELIDADE.CODFORNEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODPROD IS NULL
            AND PCDESCONTOFIDELIDADE.CODEPTO IS NULL
            AND PCDESCONTOFIDELIDADE.CODSEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODCATEGORIA IS NULL THEN 9 -- Descontos fidelidades com apenas o código da categoria informado
        WHEN PCDESCONTOFIDELIDADE.CODCATEGORIA = PCPRODUT.CODCATEGORIA
            AND PCDESCONTOFIDELIDADE.CODFORNEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODPROD IS NULL
            AND PCDESCONTOFIDELIDADE.CODEPTO IS NULL
            AND PCDESCONTOFIDELIDADE.CODSEC IS NULL
            AND PCDESCONTOFIDELIDADE.CODSUBCATEGORIA IS NULL THEN 8
        ELSE 0
    END + -- Coincidência de múltiplos atributos - somar pontuação
    (
        CASE
            WHEN PCDESCONTOFIDELIDADE.CODPROD = PCPRODUT.CODPROD THEN 1
            ELSE 0
        END + CASE
            WHEN PCDESCONTOFIDELIDADE.CODFORNEC = PCPRODUT.CODFORNEC THEN 1
            ELSE 0
        END + CASE
            WHEN PCDESCONTOFIDELIDADE.CODEPTO = PCPRODUT.CODEPTO THEN 1
            ELSE 0
        END + CASE
            WHEN PCDESCONTOFIDELIDADE.CODCATEGORIA = PCPRODUT.CODCATEGORIA THEN 1
            ELSE 0
        END + CASE
            WHEN PCDESCONTOFIDELIDADE.CODSECAO = PCPRODUT.CODSEC THEN 1
            ELSE 0
        END + CASE
            WHEN PCDESCONTOFIDELIDADE.CODSUBCATEGORIA = PCPRODUT.CODSUBCATEGORIA THEN 1
            ELSE 0
        END
    ) AS PRIORIDADE,
    PCDESCONTOFIDELIDADE.CODPROD,
    PCDESCONTOFIDELIDADE.CODEPTO,
    PCDESCONTOFIDELIDADE.CODFORNEC,
    PCDESCONTOFIDELIDADE.CODCATEGORIA,
    PCDESCONTOFIDELIDADE.CODSUBCATEGORIA,
    PCDESCONTOFIDELIDADE.CODSECAO,
    PCDESCONTOFIDELIDADE.APLICARAUTOMATICO
FROM
    PCDESCONTOFIDELIDADE
    INNER JOIN PCPRODUT ON PCPRODUT.CODAUXILIAR = :CODBARRAS
    INNER JOIN PCEMBALAGEM ON PCEMBALAGEM.CODAUXILIAR = :CODBARRAS
    AND PCEMBALAGEM.CODFILIAL = :FILIAL
WHERE
    PCDESCONTOFIDELIDADE.DTFINAL >= SYSDATE
    AND PCDESCONTOFIDELIDADE.CODFILIAL = :FILIAL
    AND PCDESCONTOFIDELIDADE.DTEXCLUSAO IS NULL -- AND PCDESCONTOFIDELIDADE.APLICARAUTOMATICO IS NULL
    AND (
        -- Coincidências de atributos
        PCDESCONTOFIDELIDADE.CODPROD = PCPRODUT.CODPROD
        OR PCDESCONTOFIDELIDADE.CODFORNEC = PCPRODUT.CODFORNEC
        OR PCDESCONTOFIDELIDADE.CODEPTO = PCPRODUT.CODEPTO
        OR PCDESCONTOFIDELIDADE.CODCATEGORIA = PCPRODUT.CODCATEGORIA
        OR PCDESCONTOFIDELIDADE.CODSECAO = PCPRODUT.CODSEC
        OR PCDESCONTOFIDELIDADE.CODSUBCATEGORIA = PCPRODUT.CODSUBCATEGORIA
    )
ORDER BY
    PRIORIDADE DESC
    FETCH FIRST 1 ROWS ONLY
`,
        {
          CODBARRAS: codauxiliar,
          FILIAL: 2
        }
      );

      const descontofidelidade = descontoResult.rows.length > 0 ? descontoResult.rows[0][0] : 0;
      const pvendafidelidade = descontoResult.rows.length > 0 ? descontoResult.rows[0][1] : pvenda;
      const dtfinalfidelidade = descontoResult.rows.length > 0 ? descontoResult.rows[0][2] : '';



      // OFERTAS
      const ofertaresult = await oracleConnection.execute(`
        SELECT PCOFERTAPROGRAMADAI.CODOFERTA, 
        PCOFERTAPROGRAMADAI.CODFILIAL, 
        PCOFERTAPROGRAMADAI.CODAUXILIAR, 
        PCOFERTAPROGRAMADAI.VLOFERTA, 
        PCOFERTAPROGRAMADAI.VLOFERTAATAC, 
        PCOFERTAPROGRAMADAI.MOTIVOOFERTA, 
        PCOFERTAPROGRAMADAI.QTMAXVENDA, 
        PCOFERTAPROGRAMADAI.DATAEXCLUSAO,
        PCOFERTAPROGRAMADAC.DESCOFERTA
        FROM PCOFERTAPROGRAMADAI
        INNER JOIN PCOFERTAPROGRAMADAC on PCOFERTAPROGRAMADAC.CODOFERTA = PCOFERTAPROGRAMADAI.CODOFERTA 
        WHERE PCOFERTAPROGRAMADAI.CODAUXILIAR = :CODAUXILIAR  
        AND PCOFERTAPROGRAMADAI.DATAEXCLUSAO IS NULL
        AND (TRUNC(SYSDATE) BETWEEN PCOFERTAPROGRAMADAC.DTINICIAL AND PCOFERTAPROGRAMADAC.DTFINAL) AND (PCOFERTAPROGRAMADAC.DTCANCEL IS NULL)
      `, {
        CODAUXILIAR: codauxiliar
      });

      const oferta_filiais_offers = ofertaresult.rows.length;
      const oferta_filial_1 = ofertaresult.rows.length > 0 ? ofertaresult.rows[0][3] : 0;
      const oferta_filial_2 = ofertaresult.rows.length > 1 ? ofertaresult.rows[1][3] : 0;
      const oferta_filial_3 = ofertaresult.rows.length > 2 ? ofertaresult.rows[2][3] : 0;
      const oferta_filial_4 = ofertaresult.rows.length > 3 ? ofertaresult.rows[3][3] : 0;
      const oferta_filial_5 = ofertaresult.rows.length > 4 ? ofertaresult.rows[4][3] : 0;
      const oferta_filial_6 = ofertaresult.rows.length > 5 ? ofertaresult.rows[5][3] : 0;
      const oferta_filial_7 = ofertaresult.rows.length > 6 ? ofertaresult.rows[6][3] : 0;

      // Verificar se o produto já existe
      const [existing] = await mysqlConnection.execute(selectQuery, [codauxiliar]);

      if (existing.length > 0) {
        // Produto existe, atualizar descrição, preço e desconto
        await mysqlConnection.execute(updateQuery, [descricao, pvenda, descontofidelidade, pvendafidelidade, dtfinalfidelidade, oferta_filial_2, oferta_filial_3, oferta_filial_4, oferta_filial_5, oferta_filial_6, oferta_filial_7, oferta_filiais_offers, codauxiliar]);
        updatedCount++;
        console.log(`UPDATE: AUX: ${codauxiliar}, DESC: ${descricao}, DFIDELIDADE: ${descontofidelidade}, PVENDA: ${pvenda}, PVENDAF: ${pvendafidelidade}`);
      } else {
        // Produto não existe, inserir novo registro
        await mysqlConnection.execute(insertQuery, [codprod, codauxiliar, descricao, pvenda, descontofidelidade, pvendafidelidade, dtfinalfidelidade, oferta_filial_2, oferta_filial_3, oferta_filial_4, oferta_filial_5, oferta_filial_6, oferta_filial_7, oferta_filiais_offers]);
        insertedCount++;
        console.log(`INSERT: AUX: ${codauxiliar}, DESC: ${descricao}, DFIDELIDADE: ${descontofidelidade}, PVENDA: ${pvenda}, PVENDAF: ${pvendafidelidade}`);
      }
    }

    console.log('Dados sincronizados com sucesso para o MySQL.');
    writeLog(
      `Sincronização concluída com sucesso: ${updatedCount} produtos atualizados, ${insertedCount} produtos registrados.`
    );

  } catch (err) {
    console.error('Erro durante o processo de sincronização:', err);
    writeLog(`Erro durante a sincronização: ${err.message}`);
  } finally {
    // Fechar conexões
    if (oracleConnection) {
      await oracleConnection.close();
      console.log('Conexão com o Oracle fechada.');
    }
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('Conexão com o MySQL fechada.');
    }

    const endTime = new Date();
    writeLog(`Sincronização finalizada. Duração: ${(endTime - startTime) / 1000}s.`);
  }
}

// Configurar horários de sincronização
const scheduleTimes = (process.env.SCHEDULE_TIMES || '0 0 * * *').split(','); // Horários separados por vírgulas

scheduleTimes.forEach((time) => {
  schedule.scheduleJob(time.trim(), () => {
    console.log(`Sincronização iniciada em: ${new Date().toLocaleString()} para o horário configurado: ${time}`);
    syncData();
  });
});

syncData();

console.log(`Sincronizações agendadas para os horários: ${scheduleTimes.join(', ')}`);
