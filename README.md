# AvaliaTCC

Plataforma web para avaliação (NPS) da exposição de TCCs das ETECs.
Node.js + Express · PostgreSQL · Sequelize (ORM) · EJS + Bootstrap 5 (responsivo) · arquitetura MVC.

## Executar

```bash
cp .env.example .env          # ajuste JWT_SECRET e ADMIN_SENHA
docker compose up -d          # PostgreSQL (ou use um Postgres existente)
npm install
npm start                     # http://localhost:3000
```

Na primeira execução são criados as tabelas, o **admin nativo** (`ADMIN_EMAIL` / `ADMIN_SENHA`) e as **5 questões padrão**.
Em produção defina `NODE_ENV=production`, `JWT_SECRET`, `ADMIN_SENHA` e, se usar HTTPS, `COOKIE_SECURE=true`.

## Estrutura (MVC)

```
src/
  config/        env.js, database.js
  models/        Unidade, Evento, Projeto, Questao, EventoQuestao, Votante, Voto, Usuario, Sessao (+ associações)
  controllers/   auth, admin, unidade, evento, projeto, questao, usuario, votacao, dashboard, home
  routes/        publico.js, auth.js, admin.js, api.js
  middlewares/   auth.js (JWT + sessão), upload.js (logo)
  services/      npsService (cálculo), authService (login/sessão), bootstrapService (seed)
  views/         layouts/, auth/, admin/, votacao/, dashboard/, partials/
  public/        css, js (app, dashboard, usuarios), uploads/logos
```

## Regras implementadas

| Requisito | Onde |
|---|---|
| Cadastro de unidade (com logo), evento (ano), projetos (ano/turma) | `/admin/unidades`, `/admin/eventos`, `/admin/eventos/:id/projetos` |
| 5 questões NPS (0–10): 0–6 detratores, 7–8 neutros, 9–10 promotores | `bootstrapService.js`, `npsService.js` |
| Cadastrar questões e escolher quais aparecem em cada evento | `/admin/questoes`, `/admin/eventos/:id/questoes` |
| Votação aberta; coleta alias, relação (aluno/ex-aluno/responsável/professor) e data de nascimento | `/votar/:eventoId` |
| Dashboard: votos totais e por TCC, NPS por TCC, NPS da feira, faixa etária | `/dashboard/:eventoId` |
| Atualização a cada 3 min (público) e 2 min (admin logado) | `dashboardController.js` + `public/js/dashboard.js` |
| Login com e-mail `@cps.sp.gov.br`, senha com hash (bcrypt) e JWT em cookie httpOnly | `authController`, `authService` |
| Admin nativo | `bootstrapService.js` |
| Logout automático após 30 min; usuários online e tempo logado | `middlewares/auth.js`, `/admin/usuarios` |

## Decisões de projeto

- **NPS**: calculado sobre todas as notas (cada nota é uma resposta); NPS = %promotores − %detratores, de −100 a +100.
- **"Voto"** = uma avaliação completa (um votante avaliando um projeto). Cada votante avalia cada projeto uma única vez (índice único no banco + cookie do votante).
- **Cadastro de usuários**: a tela pública cria usuário *inativo*; o admin aprova em `/admin/usuarios`. Para liberar na hora: `APROVACAO_CADASTRO=false`. Sem isso, qualquer pessoa com e-mail `@cps.sp.gov.br` digitado (sem confirmação de posse) poderia administrar eventos.
- **Sessão**: JWT de 30 min renovado a cada atividade + registro na tabela `sessoes` (permite listar online, derrubar sessão e expirar no servidor). O refresh automático do dashboard envia `X-Background: 1` e **não** renova a sessão.
- **Segurança**: helmet (CSP), rate limit em login/cadastro/votação, upload restrito a PNG/JPG/WEBP até 2 MB (SVG recusado), saída escapada nas views.

## Próximos passos recomendados

- Trocar `sequelize.sync()` por migrations (`sequelize-cli`) antes de ir para produção.
- LGPD: a data de nascimento é dado pessoal (inclui menores). Avalie incluir aviso/consentimento e política de retenção; para só faixa etária, dá para guardar apenas o ano de nascimento.
- Bootstrap e Chart.js vêm de CDN; para rede escolar sem internet, copie-os para `src/public/vendor` e ajuste a CSP.
- Testes automatizados (Jest + Supertest) para `npsService` e fluxo de votação.
