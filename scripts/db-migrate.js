/**
 * Cria/atualiza as tabelas da aplicação usando o usuário de trabalho (.env).
 *
 * Uso: npm run db:migrate           (cria tabelas ausentes)
 *      DB_SYNC_ALTER=true npm run db:migrate   (também ajusta colunas existentes)
 */
const env = require('../src/config/env');
const { sequelize } = require('../src/models');

async function main() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: env.dbSyncAlter });
  const tabelas = Object.values(sequelize.models).map((m) => m.getTableName());
  console.log(`✔ Tabelas sincronizadas (${tabelas.length}): ${tabelas.join(', ')}`);
  await sequelize.close();
}

main().catch((e) => {
  if (e.parent?.code === '28P01' || e.parent?.code === '3D000') {
    console.error('✖ Usuário/database inexistente ou senha incorreta. Execute antes: npm run db:setup');
  } else {
    console.error('✖ Falha na migração:', e.message);
  }
  process.exit(1);
});
