// serialId.js
const supabase = require('./db');

async function generateSerialId() {
  let serial;
  let exists = true;

  while (exists) {
    let digits = '';
    for (let i = 0; i < 9; i++) {
      digits += Math.floor(Math.random() * 10);
    }
    serial = '#' + digits;

    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('serial_id', serial)
      .maybeSingle();

    exists = !!data;
  }

  return serial;
}

module.exports = { generateSerialId };