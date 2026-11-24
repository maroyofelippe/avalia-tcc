// LGPD: nome e data de nascimento NUNCA são gravados. Guarda-se apenas o hash (HMAC-SHA256)
// da concatenação NOME(maiúsculo) + data de nascimento, que identifica o votante de forma única.
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Votante',
    {
      token: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
      hash: { type: DataTypes.STRING(64), allowNull: false },
      // Idade (anos completos) calculada no momento da identificação; a data de nascimento não é guardada
      idade: { type: DataTypes.SMALLINT, allowNull: true, validate: { min: 0, max: 130 } },
      relacao: {
        type: DataTypes.ENUM('aluno', 'ex_aluno', 'responsavel', 'professor'),
        allowNull: false,
      },
    },
    {
      tableName: 'votantes',
      underscored: true,
      indexes: [{ unique: true, fields: ['evento_id', 'hash'] }],
    }
  );
