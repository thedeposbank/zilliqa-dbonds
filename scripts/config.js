const config = {
	contractFileName: './dBonds.scilla',
	initFileName: '../tests/init.json',
};

const privateConfig = require('./config-private.js');

module.exports = Object.assign(config, privateConfig);
