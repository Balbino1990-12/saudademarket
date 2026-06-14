const path = require('path');
process.chdir(path.resolve(__dirname));
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'portugalstore_db';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const User = require('./src/models/User');
(async () => {
  try {
    const buyers = await User.getAllBuyers();
    console.log('BUYERS:', buyers.length);
    console.log(JSON.stringify(buyers.slice(0,3), null, 2));
  } catch (err) {
    console.error('ERROR:', err);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
})();