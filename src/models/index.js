const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Unidade = require('./Unidade')(sequelize, DataTypes);
const Usuario = require('./Usuario')(sequelize, DataTypes);
const Sessao = require('./Sessao')(sequelize, DataTypes);
const Evento = require('./Evento')(sequelize, DataTypes);
const Projeto = require('./Projeto')(sequelize, DataTypes);
const Questao = require('./Questao')(sequelize, DataTypes);
const EventoQuestao = require('./EventoQuestao')(sequelize, DataTypes);
const Votante = require('./Votante')(sequelize, DataTypes);
const Voto = require('./Voto')(sequelize, DataTypes);

// Unidade 1—N Evento 1—N Projeto
Unidade.hasMany(Evento, { foreignKey: { name: 'unidadeId', allowNull: false }, onDelete: 'RESTRICT' });
Evento.belongsTo(Unidade, { foreignKey: 'unidadeId' });
Evento.hasMany(Projeto, { foreignKey: { name: 'eventoId', allowNull: false }, onDelete: 'CASCADE' });
Projeto.belongsTo(Evento, { foreignKey: 'eventoId' });

// Evento N—N Questao (questões exibidas no evento)
Evento.belongsToMany(Questao, { through: EventoQuestao, foreignKey: 'eventoId', otherKey: 'questaoId' });
Questao.belongsToMany(Evento, { through: EventoQuestao, foreignKey: 'questaoId', otherKey: 'eventoId' });

// Votantes e votos
Evento.hasMany(Votante, { foreignKey: { name: 'eventoId', allowNull: false }, onDelete: 'CASCADE' });
Votante.belongsTo(Evento, { foreignKey: 'eventoId' });
Votante.hasMany(Voto, { foreignKey: { name: 'votanteId', allowNull: false }, onDelete: 'CASCADE' });
Voto.belongsTo(Votante, { foreignKey: 'votanteId' });
Projeto.hasMany(Voto, { foreignKey: { name: 'projetoId', allowNull: false }, onDelete: 'CASCADE' });
Voto.belongsTo(Projeto, { foreignKey: 'projetoId' });
Questao.hasMany(Voto, { foreignKey: { name: 'questaoId', allowNull: false }, onDelete: 'RESTRICT' });
Voto.belongsTo(Questao, { foreignKey: 'questaoId' });
Evento.hasMany(Voto, { foreignKey: { name: 'eventoId', allowNull: false }, onDelete: 'CASCADE' });
Voto.belongsTo(Evento, { foreignKey: 'eventoId' });

// Usuário 1—N Sessão
Usuario.hasMany(Sessao, { foreignKey: { name: 'usuarioId', allowNull: false }, onDelete: 'CASCADE' });
Sessao.belongsTo(Usuario, { foreignKey: 'usuarioId' });

module.exports = {
  sequelize,
  Unidade,
  Usuario,
  Sessao,
  Evento,
  Projeto,
  Questao,
  EventoQuestao,
  Votante,
  Voto,
};
