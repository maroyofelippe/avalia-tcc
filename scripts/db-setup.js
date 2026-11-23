/**
 * Cria o usuário de trabalho e o database da aplicação.
 * Solicita a senha do administrador do PostgreSQL (padrão: usuário "postgres").
 *
 * Uso: npm run db:setup
 * Opcional: PG_ADMIN_USER=outro_admin npm run db:setup
 */
const readline = require('readline');
const { Client } = require('pg');
const env = require('../src/config/env');
const sslOptions = require('../src/config/dbSsl');

function perguntar(texto, { oculto = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      rl._writeToOutput = (s) => {
        if (s.includes(texto)) rl.output.write(s);
      };
    }
    rl.question(texto, (resp) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolve(resp);
    });
  });
}

async function main() {
  const { host, port, name, user, pass } = env.db;
  const adminPadrao = env.db.adminUser;

  console.log(`Servidor PostgreSQL: ${host}:${port}`);
  const adminUser = (await perguntar(`Usuário administrador do Postgres [${adminPadrao}]: `)).trim() || adminPadrao;
  const adminPass = await perguntar(`Senha de "${adminUser}": `, { oculto: true });

  const admin = new Client({ host, port, user: adminUser, password: adminPass, database: env.db.adminDb, ssl: sslOptions() });
  await admin.connect();

  try {
    const usr = admin.escapeIdentifier(user);
    const senha = admin.escapeLiteral(pass);
    const db = admin.escapeIdentifier(name);

    const role = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [user]);
    if (role.rowCount) {
      await admin.query(`ALTER ROLE ${usr} WITH LOGIN PASSWORD ${senha}`);
      console.log(`✔ Usuário "${user}" já existia: senha atualizada.`);
    } else {
      await admin.query(`CREATE ROLE ${usr} WITH LOGIN PASSWORD ${senha}`);
      console.log(`✔ Usuário "${user}" criado.`);
    }

    const base = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (base.rowCount) {
      await admin.query(`ALTER DATABASE ${db} OWNER TO ${usr}`);
      console.log(`✔ Database "${name}" já existia: dono ajustado para "${user}".`);
    } else {
      await admin.query(`CREATE DATABASE ${db} OWNER ${usr} ENCODING 'UTF8'`);
      console.log(`✔ Database "${name}" criado.`);
    }
  } finally {
    await admin.end();
  }

  console.log('\nPronto. Agora execute: npm run db:migrate');
}

main().catch((e) => {
  if (e.code === '28P01') console.error('✖ Senha do administrador incorreta.');
  else if (e.code === 'ECONNREFUSED') console.error('✖ Não foi possível conectar ao PostgreSQL (servidor ligado?).');
  else console.error('✖ Falha no setup:', e.message);
  process.exit(1);
});
