'use strict';

const { BN, Long, bytes, units } = require("@zilliqa-js/util");
const { Zilliqa } = require("@zilliqa-js/zilliqa");
const { toBech32Address, getAddressFromPrivateKey} = require("@zilliqa-js/crypto");

const zilliqa = new Zilliqa("https://dev-api.zilliqa.com");

// These are set by the core protocol, and may vary per-chain.
// You can manually pack the bytes according to chain id and msg version.
// For more information: https://apidocs.zilliqa.com/?shell#getnetworkid

const chainId = 333; // chainId of the developer testnet
const msgVersion = 1; // current msgVersion
const VERSION = bytes.pack(chainId, msgVersion);

const config = require('./config');

zilliqa.wallet.addByPrivateKey(config.privateKey);

const address = getAddressFromPrivateKey(config.privateKey);
console.log(`My account address is: ${address}`);
console.log(`My account bech32 address is: ${toBech32Address(address)}`);

async function getGasPrice() {
	const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();
	console.log(`Current Minimum Gas Price: ${minGasPrice.result}`);
	const myGasPrice = units.toQa("1000", units.Units.Li); // Gas Price that will be used by all transactions
	console.log(`My Gas Price ${myGasPrice.toString()}`);
	const isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
	console.log(`Is the gas price sufficient? ${isGasSufficient}`);
	return myGasPrice;
}

async function deployContract(code, init) {
	console.log(code);
	console.log(init);
	const myGasPrice = await getGasPrice();

	const contract = zilliqa.contracts.new(code, init);

	const [deployTx, hello] = await contract.deploy({
		version: VERSION,
		gasPrice: myGasPrice,
		gasLimit: Long.fromNumber(10000)
	});

	// Introspect the state of the underlying transaction
	console.log(`Deployment Transaction ID: ${deployTx.id}`);
	console.log(`Deployment Transaction Receipt: ${deployTx.txParams.receipt}`);

	// Get the deployed contract address
	console.log("The contract address is:", hello.address);
}

const fs = require('fs');
const code = fs.readFileSync(config.contractFileName, {encoding: 'utf8'});
const init = require(config.initFileName);

deployContract(code, init);

