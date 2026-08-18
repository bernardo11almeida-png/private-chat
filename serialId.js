// serialId.js
// Gera um Serial ID no formato #000000000 (9 digitos), garantindo unicidade no banco.

const db = require('./db');

function generateSerialId() {
  let serial;
  let exists = true;

  const check = db.prepare('SELECT id FROM users WHERE serial_id = ?');

  while (exists) {
    let digits = '';
    for (let i = 0; i < 9; i++) {
      digits += Math.floor(Math.random() * 10);
    }
    serial = '#' + digits;
    exists = !!check.get(serial);
  }

  return serial;
}

module.exports = { generateSerialId };
