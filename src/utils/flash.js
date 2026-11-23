// Mensagens "flash" via cookie curto (evita depender de sessão em memória).
const NOME = 'avalia_flash';

module.exports = (req, res, next) => {
  res.locals.flash = null;
  const bruto = req.cookies[NOME];
  if (bruto) {
    try {
      res.locals.flash = JSON.parse(bruto);
    } catch (_) {
      /* ignora cookie malformado */
    }
    res.clearCookie(NOME);
  }
  res.flash = (tipo, mensagem) =>
    res.cookie(NOME, JSON.stringify({ tipo, mensagem }), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 1000,
    });
  next();
};
