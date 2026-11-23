const env = require('./config/env');
const app = require('./app');
const { sequelize } = require('./models');
const bootstrap = require('./services/bootstrapService');
const authService = require('./services/authService');

async function iniciar() {
  await sequelize.authenticate();
  // Em produção prefira migrations (sequelize-cli); sync cria as tabelas na primeira execução.
  await sequelize.sync({ alter: env.dbSyncAlter });
  await bootstrap.executar();

  // Encerra sessões inativas há mais de SESSAO_MINUTOS
  setInterval(authService.limparExpiradas, 60 * 1000).unref();

  app.listen(env.port, () => console.log(`AvaliaTCC em http://localhost:${env.port}`));
}

iniciar().catch((e) => {
  console.error('Falha ao iniciar:', e);
  process.exit(1);
});
