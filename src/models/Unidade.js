module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Unidade',
    {
      nome: { type: DataTypes.STRING(150), allowNull: false },
      codigo: { type: DataTypes.STRING(20) },
      cidade: { type: DataTypes.STRING(100) },
      logo: { type: DataTypes.STRING(255) }, // caminho público da imagem
    },
    { tableName: 'unidades', underscored: true }
  );
