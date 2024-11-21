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

  // Escreve o log no arquivo (adicionando ao final)
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

    // Executar a consulta no Oracle
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
      INSERT INTO produtos (codprod, codauxiliar, descricao, pvenda) 
      VALUES (?, ?, ?, ?)
    `;
    const updateQuery = `
      UPDATE produtos 
      SET descricao = ?, pvenda = ? 
      WHERE codauxiliar = ?
    `;

    for (const row of result.rows) {
      const [codprod, codauxiliar, descricao, pvenda] = row;

      // Verificar se o produto já existe
      const [existing] = await mysqlConnection.execute(selectQuery, [codauxiliar]);

      if (existing.length > 0) {
        // Produto existe, atualizar descrição e preço
        await mysqlConnection.execute(updateQuery, [descricao, pvenda, codauxiliar]);
        updatedCount++;
        console.log(`Produto atualizado: ${codauxiliar}`);
      } else {
        // Produto não existe, inserir novo registro
        await mysqlConnection.execute(insertQuery, [codprod, codauxiliar, descricao, pvenda]);
        insertedCount++;
        console.log(`Produto inserido: ${codauxiliar}`);
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

console.log(`Sincronizações agendadas para os horários: ${scheduleTimes.join(', ')}`);
