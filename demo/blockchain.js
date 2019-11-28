'use strict';

const { BN, Long, bytes, units } = require("@zilliqa-js/util");
const { Zilliqa } = require("@zilliqa-js/zilliqa");
const { toBech32Address, getAddressFromPrivateKey, getPubKeyFromPrivateKey} = require("@zilliqa-js/crypto");

const config = require('./config');

const zilliqa = new Zilliqa(config.apiUrl);

const msgVersion = 1; // current msgVersion
const VERSION = bytes.pack(config.chainId, msgVersion);

zilliqa.wallet.addByPrivateKey(config.deployer.privateKey);

const address = getAddressFromPrivateKey(config.deployer.privateKey);
// console.log(`My account address is: ${address}`);
// console.log(`My account bech32 address is: ${toBech32Address(address)}`);

async function getGasPrice() {
	const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();
	console.log(`Current Minimum Gas Price: ${minGasPrice.result}`);
	const myGasPrice = units.toQa("1100", units.Units.Li); // Gas Price that will be used by all transactions
	console.log(`My Gas Price ${myGasPrice.toString()}`);
	const isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
	console.log(`Is the gas price sufficient? ${isGasSufficient}`);
	return myGasPrice;
}

async function deployContract(code, init) {
	console.log('init:', init);
	const myGasPrice = await getGasPrice();

	const contract = zilliqa.contracts.new(code, init);
	const txParams = {
		version: VERSION,
		gasPrice: myGasPrice,
		gasLimit: Long.fromNumber(60000)
	};

	const [deployTx, hello] = await contract.deploy(txParams);

	if(contract.isDeployed()) {
		// Introspect the state of the underlying transaction
		console.log(`Deployment Transaction ID: ${deployTx.id}`);
		console.log(`Deployment Transaction Receipt: ${deployTx.txParams.receipt}`);
		// Get the deployed contract address
		console.log('The contract address is:', hello.address);
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
	const contract = zilliqa.contracts.at(address);
	const txParams = {
		version: VERSION,
		amount: new BN(0),
		gasPrice,
		gasLimit: Long.fromNumber(40000)
	};
	if(caller) {
		if(!zilliqa.wallet.accounts[config.accounts[caller].address])
			zilliqa.wallet.addByPrivateKey(config.accounts[caller].privateKey);
		txParams.pubKey = zilliqa.wallet.accounts[config.accounts[caller].address].publicKey;
	}

	const gasPrice = await getGasPrice();
	return await contract.call(transition, args, txParams);
}

module.exports = {
	deployContract,
	getState,
	runTransition
};
