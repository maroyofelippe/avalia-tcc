const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const DESTINO = path.join(__dirname, '..', 'public', 'uploads', 'logos');
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: DESTINO,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!EXT[file.mimetype]) return cb(new Error('Envie uma imagem PNG, JPG ou WEBP.'));
    cb(null, true);
  },
});

// SVG é recusado de propósito (pode conter scripts).
function uploadLogo(req, res, next) {
  upload.single('logo')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 2 MB.' : err.message;
    res.flash('erro', msg);
    res.redirect(req.get('Referer') || '/admin/unidades');
  });
}

module.exports = { uploadLogo, DESTINO };
