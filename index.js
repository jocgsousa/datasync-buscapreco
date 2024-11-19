require('dotenv/config');
const oracledb = require('oracledb');
const mysql = require('mysql2/promise');
const path = require('path');

// Configuração do Oracle Instant Client
const oracleClientPath = path.resolve(__dirname, 'instantclient_19_25');
oracledb.initOracleClient({ libDir: oracleClientPath });

async function syncData() {
  let oracleConnection;
  let mysqlConnection;

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
        console.log(`Produto atualizado: ${codauxiliar}`);
      } else {
        // Produto não existe, inserir novo registro
        await mysqlConnection.execute(insertQuery, [codprod, codauxiliar, descricao, pvenda]);
        console.log(`Produto inserido: ${codauxiliar}`);
      }
    }
    console.log('Dados sincronizados com sucesso para o MySQL.');

  } catch (err) {
    console.error('Erro durante o processo de sincronização:', err);
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
  }
}

syncData();
