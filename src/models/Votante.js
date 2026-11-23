module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Votante',
    {
      token: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
      alias: { type: DataTypes.STRING(60), allowNull: false },
      relacao: {
        type: DataTypes.ENUM('aluno', 'ex_aluno', 'responsavel', 'professor'),
        allowNull: false,
      },
      dataNascimento: { type: DataTypes.DATEONLY, allowNull: false, field: 'data_nascimento' },
    },
    { tableName: 'votantes', underscored: true }
  );
