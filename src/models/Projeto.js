module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Projeto',
    {
      titulo: { type: DataTypes.STRING(200), allowNull: false },
      curso: { type: DataTypes.STRING(120) },
      turma: { type: DataTypes.STRING(40), allowNull: false },
      ano: { type: DataTypes.INTEGER, allowNull: false },
      equipe: { type: DataTypes.TEXT },
      descricao: { type: DataTypes.TEXT },
    },
    { tableName: 'projetos', underscored: true }
  );
