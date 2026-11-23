module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Evento',
    {
      nome: { type: DataTypes.STRING(160), allowNull: false },
      ano: { type: DataTypes.INTEGER, allowNull: false },
      dataEvento: { type: DataTypes.DATEONLY, field: 'data_evento' },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      votacaoAberta: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'votacao_aberta' },
    },
    { tableName: 'eventos', underscored: true }
  );
