/**
 * Cria/atualiza as tabelas da aplicação usando o usuário de trabalho (.env).
 *
 * Uso: npm run db:migrate           (cria tabelas ausentes)
 *      DB_SYNC_ALTER=true npm run db:migrate   (também ajusta colunas existentes)
 */
const env = require('../src/config/env');
const { sequelize } = require('../src/models');

// LGPD: remove nome/data de nascimento de votantes já gravados, converte a data em idade e gera um hash para cada registro legado
async function migrarVotantesLgpd() {
  const [[tabela]] = await sequelize.query("SELECT to_regclass('votantes') AS t");
  if (!tabela.t) return;
  const [cols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'votantes'");
  const nomes = cols.map((c) => c.column_name);
  if (!nomes.includes('alias') && !nomes.includes('data_nascimento')) return;
  await sequelize.query('ALTER TABLE votantes ADD COLUMN IF NOT EXISTS hash VARCHAR(64)');
  await sequelize.query('ALTER TABLE votantes ADD COLUMN IF NOT EXISTS idade SMALLINT');
  // Preserva a idade dos votantes antigos antes de apagar a data de nascimento
  if (nomes.includes('data_nascimento')) {
    await sequelize.query('UPDATE votantes SET idade = EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento))::int WHERE idade IS NULL');
  }
  // Registros antigos: não há como recalcular o hash sem o nome completo; usa-se um valor aleatório irreversível
  await sequelize.query("UPDATE votantes SET hash = encode(sha256((token::text || id::text || random()::text)::bytea), 'hex') WHERE hash IS NULL");
  await sequelize.query('ALTER TABLE votantes ALTER COLUMN hash SET NOT NULL');
  await sequelize.query('ALTER TABLE votantes DROP COLUMN IF EXISTS alias, DROP COLUMN IF EXISTS data_nascimento');
  console.log('✔ Votantes: nome e data de nascimento removidos; idade e hash gerados.');
}

async function main() {
  await sequelize.authenticate();
  await migrarVotantesLgpd();
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
