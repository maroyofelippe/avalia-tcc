// Uma linha = nota (0–10) de um votante para uma questão de um projeto
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Voto',
    {
      nota: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 10 } },
    },
    {
      tableName: 'votos',
      underscored: true,
      indexes: [
        { unique: true, fields: ['votante_id', 'projeto_id', 'questao_id'] },
        { fields: ['evento_id'] },
        { fields: ['projeto_id'] },
      ],
    }
  );
