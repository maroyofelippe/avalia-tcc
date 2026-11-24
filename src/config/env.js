require('dotenv').config();

const producao = process.env.NODE_ENV === 'production';

if (producao && (!process.env.JWT_SECRET || !process.env.ADMIN_SENHA)) {
  throw new Error('Em produção defina JWT_SECRET e ADMIN_SENHA no ambiente.');
}

module.exports = {
  producao,
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'avalia_tcc',
    user: process.env.DB_USER || 'avalia',
    pass: process.env.DB_PASS || 'avalia123',
    adminUser: process.env.PG_ADMIN_USER || 'postgres',
    adminDb: process.env.PG_ADMIN_DB || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    sslCa: process.env.DB_SSL_CA || '',
  },
  jwtSecret: process.env.JWT_SECRET || 'segredo-apenas-para-desenvolvimento',
  votanteHashSecret: process.env.VOTANTE_HASH_SECRET || process.env.JWT_SECRET || 'segredo-apenas-para-desenvolvimento',
  sessaoMinutos: Number(process.env.SESSAO_MINUTOS) || 30,
  // true apenas se o site for servido por HTTPS
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // cadastros pela tela pública ficam inativos até o admin aprovar
  aprovacaoCadastro: process.env.APROVACAO_CADASTRO !== 'false',
  dbSyncAlter: process.env.DB_SYNC_ALTER === 'true',
  dominioInstitucional: '@cps.sp.gov.br',
  admin: {
    nome: process.env.ADMIN_NOME || 'Administrador',
    email: (process.env.ADMIN_EMAIL || 'admin@cps.sp.gov.br').toLowerCase(),
    senha: process.env.ADMIN_SENHA || 'Admin@12345',
  },
  refreshPublicoSeg: Number(process.env.REFRESH_PUBLICO_SEG) || 180,
  refreshAdminSeg: Number(process.env.REFRESH_ADMIN_SEG) || 120,
};
