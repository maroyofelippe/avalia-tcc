module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Sessao',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, // = jti do JWT
      inicio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ultimaAtividade: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'ultima_atividade',
      },
      encerradaEm: { type: DataTypes.DATE, field: 'encerrada_em' },
      motivoEncerramento: { type: DataTypes.STRING(30), field: 'motivo_encerramento' }, // logout | inatividade
      ip: { type: DataTypes.STRING(60) },
    },
    { tableName: 'sessoes', underscored: true }
  );
