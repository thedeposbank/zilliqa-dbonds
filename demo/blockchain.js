'use strict';

const { BN, Long, bytes, units } = require("@zilliqa-js/util");
const { Zilliqa } = require("@zilliqa-js/zilliqa");
const { toBech32Address, getAddressFromPrivateKey, getPubKeyFromPrivateKey } = require("@zilliqa-js/crypto");

const config = require('./config');

const zilliqa = new Zilliqa(config.apiUrl);

const msgVersion = 1; // current msgVersion
const VERSION = bytes.pack(config.chainId, msgVersion);

for(let acc in config.accounts) {
	zilliqa.wallet.addByPrivateKey(config.accounts[acc].privateKey);
}

async function getGasPrice() {
	const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();
	// console.log(`Current Minimum Gas Price: ${minGasPrice.result}`);
	const myGasPrice = units.toQa("1000", units.Units.Li); // Gas Price that will be used by all transactions
	// console.log(`My Gas Price ${myGasPrice.toString()}`);
	const isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
	// console.log(`Is the gas price sufficient? ${isGasSufficient}`);
	if(isGasSufficient)
		return myGasPrice;
	return new BN(minGasPrice.result);
}

async function deployContract(code, init) {
	const myGasPrice = await getGasPrice();

	const contract = zilliqa.contracts.new(code, init);
	const txParams = {
		version: VERSION,
		gasPrice: myGasPrice,
		gasLimit: Long.fromNumber(32000)
	};

	let deployTx, hello;
	try {
		[deployTx, hello] = await contract.deploy(txParams, 33, 1000, true);
		console.log('deployment tx receipt: %o', deployTx.txParams.receipt);
	} catch(e) {
		console.error(e);
		process.exit(1);
	}

	if(contract.isDeployed()) {
		return { tx: deployTx, address: hello.address };
	}
	return null;
}

// address -- address or contract name as it is in config.contracts
async function getState(address) {
	if(address.slice(0, 2) != '0x')
		address = config.contracts[address].address;
	const contract = zilliqa.contracts.at(address);
	return await contract.getState();
}

// address -- address or contract name as it is in config.contracts
// caller -- account name as it is in config.accounts
async function runTransition(address, transition, args, caller) {
	if(address.slice(0, 2) != '0x')
		address = config.contracts[address].address;
	const gasPrice = await getGasPrice();
	const contract = zilliqa.contracts.at(address);
	const txParams = {
		version: VERSION,
		amount: new BN(0),
		gasPrice,
		gasLimit: Long.fromNumber(10000)
	};
	if(caller) {
		if(!zilliqa.wallet.accounts[config.accounts[caller].address])
			zilliqa.wallet.addByPrivateKey(config.accounts[caller].privateKey);
		txParams.pubKey = zilliqa.wallet.accounts[config.accounts[caller].address].publicKey;
	}

	return await contract.call(transition, args, txParams, 33, 1000, true);
}

function createAccount(testnet = true) {
	const address = zilliqa.wallet.create();
	const privateKey = zilliqa.wallet.accounts[address].privateKey;
	const bech32Address = toBech32Address(address, testnet);
	return { address, privateKey, bech32Address };
}

module.exports = {
	deployContract,
	getState,
	runTransition,
	createAccount
};
