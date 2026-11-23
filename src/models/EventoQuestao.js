// Tabela associativa: quais questões aparecem em cada evento
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'EventoQuestao',
    {
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'evento_questoes', underscored: true }
  );
