const fs = require('fs');
const path = require('path');
const env = require('./env');

// Opções de SSL do driver pg (Aiven exige SSL). Retorna false se DB_SSL != true.
module.exports = function sslOptions() {
  if (!env.db.ssl) return false;
  if (env.db.sslCa) {
    const arq = path.resolve(env.db.sslCa);
    if (!fs.existsSync(arq)) {
      throw new Error(`Certificado CA não encontrado em ${arq}. Baixe o ca.pem no console do Aiven ou ajuste DB_SSL_CA.`);
    }
    return { ca: fs.readFileSync(arq, 'utf8'), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
};
