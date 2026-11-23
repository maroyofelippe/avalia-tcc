module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Usuario',
    {
      nome: { type: DataTypes.STRING(120), allowNull: false },
      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      senhaHash: { type: DataTypes.STRING(100), allowNull: false, field: 'senha_hash' },
      perfil: { type: DataTypes.ENUM('admin', 'gestor'), allowNull: false, defaultValue: 'gestor' },
      // Cadastros feitos pela tela pública entram inativos até o admin aprovar
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      nativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'usuarios', underscored: true }
  );
