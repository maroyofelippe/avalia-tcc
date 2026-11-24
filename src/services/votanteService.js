const crypto = require('crypto');
const env = require('../config/env');

// Nome em maiúsculas, sem espaços sobrando — evita divergência por erro de digitação
function normalizarNome(nome) {
  return String(nome || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
}

/**
 * Identificador único do votante: HMAC-SHA256(NOME_MAIUSCULO + '|' + AAAA-MM-DD).
 * A chave secreta (pepper) impede que o hash seja revertido por força bruta
 * (nomes + datas de nascimento formam um espaço pequeno de combinações).
 */
function gerarHash(nome, dataNascimento) {
  return crypto
    .createHmac('sha256', env.votanteHashSecret)
    .update(`${normalizarNome(nome)}|${dataNascimento}`)
    .digest('hex');
}

// Idade em anos completos na data de hoje (dataNascimento = 'AAAA-MM-DD', já validada)
function calcularIdade(dataNascimento, hoje = new Date()) {
  const [a, m, d] = dataNascimento.split('-').map(Number);
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade -= 1;
  return idade;
}

module.exports = { normalizarNome, gerarHash, calcularIdade };
