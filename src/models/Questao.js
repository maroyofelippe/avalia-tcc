module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Questao',
    {
      texto: { type: DataTypes.STRING(300), allowNull: false },
      ativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      padrao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // as 5 questões iniciais
    },
    { tableName: 'questoes', underscored: true }
  );
