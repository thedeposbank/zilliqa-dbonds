#!/usr/bin/node

'use strict';

const fs = require('fs');
const util = require('util');
const config = require('./config');
const blockchain = require('./blockchain');
const Debug = require('debug');
const debug = Debug('demo');
const debugWeb = Debug('web');
const express = require('express');

function printUsage() {
	console.log('\nUsage:\n\tdemo.js deploy {contract name}');
	console.log('\tdemo.js run {test case name}');
	console.log('\tdemo.js serve');
	console.log('\tdemo.js scenario');
	console.log('\tdemo.js show {contract name}');
	console.log('');
	process.exit(1);
}

if(process.argv.length < 3)
	printUsage();

switch(process.argv[2]) {
	case 'deploy':
		if(process.argv.length < 4)
			printUsage();
		deploy(process.argv[3]);
		break;
	case 'serve':
		showState();
		runServer();
		break;
	case 'run':
		if(process.argv.length < 4)
			printUsage();
		runTest(process.argv[3]);
		break;
	case 'scenario':
		runServer();
		runScenario();
		break;
	case 'scenario2':
		runServer();
		runScenario2();
		break;
	case 'genacc':
		generateAccounts();
		break;
	case 'show':
		if(process.argv.lengh < 4)
			printUsage();
		showState(process.argv[3]);
		break;
	default:
		printUsage();
}

function nameToAddress(name) {
	const ByStr20re = /^0x[0-9a-fA-F]{40}$/;
	if(ByStr20re.test(name))
		return name;
	let address;
	if(config.accounts[name])
		address = config.accounts[name].address;
	else if(config.contracts[name])
		address = config.contracts[name].address;
	else
		throw new Error('unknown address: ' + name);
	return address;
}

function addressToName(address, defaultName) {
	const ByStr20re = /^0x[0-9a-fA-F]{40}$/;
	if(!ByStr20re.test(address))
		return address;
	const addr = address.toLowerCase();
	for(let name in config.accounts) {
		if(config.accounts[name].address.toLowerCase() == addr)
			return name;
	}
	for(let contractName in config.contracts) {
		if(config.contracts[contractName].address.toLowerCase() == addr)
			return contractName;
	}
	if(defaultName)
		return defaultName;
	return address;
}

function stringify(data, convert, spaces) {
	return JSON.stringify(data, convert, spaces).replace(/"(0x[0-9a-f]{40})"/gi, (match, addr) => ('"address:'+addressToName(addr, 'unknown')+'"'));
}

async function deploy(contractName) {
	if(!config.contracts[contractName]) {
		debug('unknown contract name "%s"', contractName);
		process.exit(2);
	}
	debug('deploying "%s"...', contractName);
	const contract = config.contracts[contractName];
	const code = fs.readFileSync(contract.fileName, {encoding: 'utf8'});
	debug('code loaded, %d chars, %d lines', code.length, code.trimEnd().split('\n').length);

	const result = await blockchain.deployContract(code, contract.init);

	if(result) {
		debug('success, deployment txid: %s, contract address: %s', result.tx.id, result.address);
	}
	else {
		debug('deployment failed');
	}
}

async function runTest(testName) {
	if(!config.tests[testName]) {
		console.log('unknown test name "%s"', testName);
		process.exit(3);
	}
	const test = config.tests[testName];
	const contract = config.contracts[test.contractName];
	console.log('running test "%s"...', testName);
	console.log(contract.address);
	console.log(test.transition);
	console.log(test.args);
	const tx = await blockchain.runTransition(contract.address, test.transition, test.args);
	console.log('done, txid:', tx.id);
}

async function callTransition(callerName, contractName, transition, args) {

	debug('calling: %s => %s.%s(%s)', callerName, contractName, transition, stringify(args, makeHumanReadable, 2));
	// await pause('press any key to proceed...');
	if(!config.accounts[callerName])
		throw new Error('unknown caller name ' + callerName);
	if(!config.contracts[contractName])
		throw new Error('unknown contract name ' + contractName);
	const contract = config.contracts[contractName];
	if(!contract.transitions[transition])
		throw new Error('unknown transition ' + transition);
	const vnames = contract.transitions[transition];
	const argsArray = [];
	for(let vname in vnames) {
		if(args[vname] == undefined)
			throw new Error('undefined argument ' + vname);
		const v = { vname, type: vnames[vname], value: args[vname] };
		if(v.type == 'ByStr20' && v.value.slice(0, 2) != '0x') {
			v.value = nameToAddress(v.value);
		}
		argsArray.push(v);
	}
	const tx = await blockchain.runTransition(contractName, transition, argsArray, callerName);
	debug('done, tx.id: %s, receipt: %s', tx.id, stringify(tx.txParams.receipt, null, 2));
	if(!tx.isConfirmed())
		throw new Error('tx is not confirmed!');
}

async function updateGlobalState(print) {
	const names = Object.keys(config.contracts);
	const states = await Promise.all(names.map(name => blockchain.getState(config.contracts[name].address)));
	for(let i = 0; i < names.length; i++) {
		config.contracts[names[i]].state = states[i];
		if(print)
			print(names[i], states[i]);
	}
}

function makeHumanReadable(key, value) {
	if(key == 'cur_state' && value >= 0 && value <= 6)
		return config.dbondStates[value];
	if(key == 'code' && value >= 0 && value <= 4)
		return config.transferCodes[value];
	return value;
}

async function showState() {
	debug('requesting contracts state...');
	await updateGlobalState((contractName, state) => {
		debug('state of contract %s:', contractName);
		debug(stringify(state, makeHumanReadable, 2) + '\n');
	});
	debug('contracts state updated');
}

function statesForWeb() {
	const result = {};
	for(let contractName in config.contracts) {
		const stringified = stringify(config.contracts[contractName].state, makeHumanReadable, 2);
		const humanReadable = JSON.parse(stringified);
		result[contractName] = humanReadable;
		const scalar = {};
		for(let key in humanReadable) {
			if(typeof humanReadable[key] == 'string')
				scalar[key] = humanReadable[key];
		}
		result[contractName].__json = stringified;
		result[contractName].__scalar = scalar;
	}
	return result;
}

function runServer() {
	const app = express();
	app.set('view engine', 'pug');
	app.use(express.static(__dirname + '/public'));
	app.get('/', (req, res) => {
		const data = statesForWeb();
		debugWeb(data);
		res.render('index', data);
	});
	const server = app.listen(8080, () => {
		debugWeb('running on port %d', server.address().port);
	})
}

async function pause(msg, delay) {
	const stdin = process.stdin;
	process.stdout.write(msg + '\n');
	return new Promise((resolve, reject) => {
		if(delay)
			setTimeout(() => {
				stdin.setRawMode(false);
				resolve(msg+': timeout');
			}, delay);
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');
		stdin.on('data', s => {
			stdin.setRawMode(false);
			resolve(s);
			if(s == 'q') {
				console.log('exit');
				process.exit(2);
			}
		});
	});
}

function generateAccounts() {
	const result = [];
	for(let accName in config.accounts) {
		const account = blockchain.createAccount();
		result.push({ name: accName, account });
	}
	console.log(
		'{\n' + 
		result.map(acc => util.format("\t%s: {\n\t\taddress: '%s',\n\t\tprivateKey: '%s',\n\t\tbech32Address: '%s'\n\t}",
			acc.name, acc.account.address, acc.account.privateKey, acc.account.bech32Address)).join(',\n') +
		'\n}\n');
}

async function runScenario() {
	await showState();

	await callTransition('stableCoinOwner', 'stableCoin', 'Transfer', {to: 'user', tokens: '100000000', code: '0'});
	await showState();
	await pause('signing agreement (press a key when done)');
	await callTransition('dBondsOwner', 'dBonds', 'CreateUpdateDBond', { init_dbond: {
		"constructor" : "FcdbCon",
		"argtypes"    : [],
		"arguments"   : [
			{
				"constructor" : "FiatBondCon",
				"argtypes" : [],
				"arguments" : [
					"1602324610",
					"US25152R5F60"
				]
			},
			"10",
			"1602000000",
			"1602324610",
			config.contracts.stableCoin.address,
			"10000",
			config.accounts.dBondVerifier.address,
			config.accounts.counterParty.address,
			config.accounts.liquidationAgent.address,
			"300",
			"http://sdfsdf.com/sdfsdf"
		]
	}});
	await showState();

	const fiatMaturityTimestamp = (new Date(2021, 4, 12, 8)).getTime()/1000; // 4 -- month index from 0 (May)
	const maturityTimestamp     = (new Date(2021, 4,  5, 8)).getTime()/1000;
	const retireTimestamp       = (new Date(2021, 4, 25, 8)).getTime()/1000;

	await callTransition('dBondsOwner', 'dBonds', 'CreateUpdateDBond', { init_dbond: {
		"constructor" : "FcdbCon",
		"argtypes"    : [],
		"arguments"   : [
			{
				"constructor" : "FiatBondCon",
				"argtypes" : [],
				"arguments" : [
					fiatMaturityTimestamp.toString(),
					"US25152R5F60"
				]
			},
			"50000",
			maturityTimestamp.toString(),
			retireTimestamp.toString(),
			config.contracts.stableCoin.address,
			"95000",
			config.accounts.dBondVerifier.address,
			config.accounts.counterParty.address,
			config.accounts.liquidationAgent.address,
			"300",
			"https://bit.ly/2VrMIPi"
		]
	}});
	await showState();
	await callTransition('dBondsOwner', 'dBonds', 'FreezeTillVer', {});
	await showState();
	await callTransition('dBondVerifier', 'dBonds', 'VerifyDBond', {});
	await showState();
	await callTransition('swapContractOwner', 'swapContract', 'AddDBond', {
		db_contract: config.contracts.dBonds.address,
		dbond: {
			"argtypes": [],
			"arguments": [
				{
					"argtypes": [],
					"arguments": [
						fiatMaturityTimestamp.toString(),
						"US25152R5F60"
					],
					"constructor": "FiatBondCon"
				},
				"50000",
				maturityTimestamp.toString(),
				retireTimestamp.toString(),
				config.contracts.stableCoin.address,
				"95000",
				config.accounts.dBondVerifier.address,
				config.accounts.counterParty.address,
				config.accounts.liquidationAgent.address,
				"300",
				"https://bit.ly/2VrMIPi"
			],
			"constructor": "FcdbCon"
		}
	});
	await showState();
	const now = Math.floor(Date.now()/1000);
	await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: now.toString() });
	await showState();
	await callTransition('user', 'dBonds', 'RequestTime', {});
	await showState();
	await callTransition('user', 'dBonds', 'GetUpdCurPrice', {});
	await showState();

	await callTransition('dBondsOwner', 'dBonds', 'Transfer', {to: 'user', tokens: '40000', code: '0'});
	await showState();
	const cur_price = config.contracts.dBonds.state.cur_price;

	await callTransition('user', 'stableCoin', 'Transfer', {to: 'dBondsOwner', tokens: Math.round(cur_price * 4).toString(), code: '0'});
	await showState();

	// await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: (maturityTimestamp - 36000).toString() });
	// await showState();
	// await callTransition('user', 'dBonds', 'RequestTime', {});
	// await showState();
	// await callTransition('user', 'dBonds', 'GetUpdCurPrice', {});
	// await showState();

	// await callTransition('stableCoinOwner', 'stableCoin', 'Transfer', {to: 'dBondsOwner', tokens: '1000000', code: '0'});
	// await showState();

	// await callTransition('dBondsOwner', 'dBonds', 'Transfer', {to: 'swapContract', tokens: '10000', code: '3'});
	// await showState();
	// const payoffPrice = parseInt(config.contracts.dBonds.state.dbond.arguments[5]);

	// await callTransition('dBondsOwner', 'stableCoin', 'Transfer', {to: 'dBonds', tokens: Math.round(payoffPrice * 4).toString(), code: '1'});
	// await showState();

	// await callTransition('user', 'dBonds', 'Transfer', {to: 'swapContract', tokens: '20000', code: '4'});
	// await showState();

	// await callTransition('user', 'dBonds', 'Transfer', {to: 'swapContract', tokens: '20000', code: '4'});
	// await showState();

	// await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: (retireTimestamp - 36000).toString() });
	// await showState();

	// await callTransition('user', 'dBonds', 'RequestTime', {});
	// await showState();

	await pause('press any key to quit')
	process.exit(0);
}

async function runScenario2() {
	await showState();

	await callTransition('stableCoinOwner', 'stableCoin', 'Transfer', {to: 'user', tokens: '100000000', code: '0'});
	await showState();
	// await pause('signing agreement (press a key when done)');

	const fiatMaturityTimestamp = (new Date(2021, 4, 12, 8)).getTime()/1000; // 4 -- month index from 0 (May)
	const maturityTimestamp     = (new Date(2021, 4,  5, 8)).getTime()/1000;
	const retireTimestamp       = (new Date(2021, 4, 25, 8)).getTime()/1000;

	await callTransition('dBondsOwner', 'dBonds', 'CreateUpdateDBond', { init_dbond: {
		"constructor" : "FcdbCon",
		"argtypes"    : [],
		"arguments"   : [
			{
				"constructor" : "FiatBondCon",
				"argtypes" : [],
				"arguments" : [
					fiatMaturityTimestamp.toString(),
					"US25152R5F60"
				]
			},
			"50000",
			maturityTimestamp.toString(),
			retireTimestamp.toString(),
			config.contracts.stableCoin.address,
			"95000",
			config.accounts.dBondVerifier.address,
			config.accounts.counterParty.address,
			config.accounts.liquidationAgent.address,
			"300",
			"https://bit.ly/2VrMIPi"
		]
	}});
	await showState();

	await callTransition('dBondsOwner', 'dBonds', 'FreezeTillVer', {});
	await showState();
	await callTransition('dBondVerifier', 'dBonds', 'VerifyDBond', {});
	await showState();
	await callTransition('swapContractOwner', 'swapContract', 'AddDBond', {
		db_contract: config.contracts.dBonds.address,
		dbond: {
			"argtypes": [],
			"arguments": [
				{
					"argtypes": [],
					"arguments": [
						fiatMaturityTimestamp.toString(),
						"US25152R5F60"
					],
					"constructor": "FiatBondCon"
				},
				"50000",
				maturityTimestamp.toString(),
				retireTimestamp.toString(),
				config.contracts.stableCoin.address,
				"95000",
				config.accounts.dBondVerifier.address,
				config.accounts.counterParty.address,
				config.accounts.liquidationAgent.address,
				"300",
				"https://bit.ly/2VrMIPi"
			],
			"constructor": "FcdbCon"
		}
	});
	await showState();

	const now = Math.floor(Date.now()/1000);
	await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: now.toString() });
	await showState();
	await callTransition('user', 'dBonds', 'RequestTime', {});
	await showState();
	await callTransition('user', 'dBonds', 'GetUpdCurPrice', {});
	await showState();

	await callTransition('dBondsOwner', 'dBonds', 'Transfer', {to: 'user', tokens: '40000', code: '0'});
	await showState();
	const cur_price = config.contracts.dBonds.state.cur_price;

	await callTransition('user', 'stableCoin', 'Transfer', {to: 'dBondsOwner', tokens: Math.round(cur_price * 4).toString(), code: '0'});
	await showState();

	await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: (retireTimestamp - 36000).toString() });
	await showState();
	await callTransition('user', 'dBonds', 'RequestTime', {});
	await showState();
	await callTransition('user', 'dBonds', 'GetUpdCurPrice', {});
	await showState();

	await callTransition('user', 'dBonds', 'ClaimDefault', {});
	await showState();
	await callTransition('user', 'dBonds', 'GetUpdCurPrice', {});
	await showState();

	await callTransition('stableCoinOwner', 'stableCoin', 'Transfer', {to: 'liquidationAgent', tokens: (107000*5).toString(), code: '0'});
	await showState();
	const payoffPrice = parseInt(config.contracts.dBonds.state.dbond.arguments[5]);

	await callTransition('liquidationAgent', 'stableCoin', 'Transfer', {to: 'dBonds', tokens: (payoffPrice * 5).toString(), code: '2'});
	await showState();

	await callTransition('user', 'dBonds', 'Transfer', {to: 'swapContract', tokens: '40000', code: '4'});
	await showState();

	await pause('press any key to quit')
	process.exit(0);
}
