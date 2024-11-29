require('dotenv/config');
const oracledb = require('oracledb');
const path = require('path');

// Configuração do Oracle Instant Client
const oracleClientPath = path.resolve(__dirname, 'instantclient_19_25');
oracledb.initOracleClient({ libDir: oracleClientPath });

async function syncData() {
    let oracleConnection;

    try {
        // Conexão com o Oracle
        oracleConnection = await oracledb.getConnection({
            user: process.env.LCDBUSER,
            password: process.env.LCDBPASS,
            connectString: `${process.env.LCDBHOST}/${process.env.LCDBNAME}`
        });
        console.log('Conectado ao Oracle DB.');

        // Executar a consulta no Oracle

        const result = await oracleConnection.execute(`
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
            CODAUXILIAR: '7896025536661'
        });

       

        const oferta_filiais_offers = result.rows.length;
        const oferta_filial_1 = result.rows.length > 0 ? result.rows[0][3] : 0;
        const oferta_filial_2 = result.rows.length > 1 ? result.rows[1][3] : 0;
        const oferta_filial_3 = result.rows.length > 2 ? result.rows[2][3] : 0;
        const oferta_filial_4 = result.rows.length > 3 ? result.rows[3][3] : 0;
        const oferta_filial_5 = result.rows.length > 4 ? result.rows[4][3] : 0;
        const oferta_filial_6 = result.rows.length > 5 ? result.rows[5][3] : 0;
        const oferta_filial_7 = result.rows.length > 6 ? result.rows[6][3] : 0;

    } catch (err) {
        console.error('Falha de conexão com o banco de dados', err);
    }
}

syncData();
