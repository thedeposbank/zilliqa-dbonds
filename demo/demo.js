#!/usr/bin/node

'use strict';

const fs = require('fs');
const config = require('./config');
const blockchain = require('./blockchain');

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
		runServer();
		break;
	case 'run':
		if(process.argv.length < 4)
			printUsage();
		runTest(process.argv[3]);
		break;
	case 'scenario':
		runScenario();
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

function addressToName(address) {
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
	return address;
}

async function deploy(contractName) {
	if(!config.contracts[contractName]) {
		console.log('unknown contract name "%s"', contractName);
		process.exit(2);
	}
	console.log('deploying "%s"...', contractName);
	const contract = config.contracts[contractName];
	const code = fs.readFileSync(contract.fileName, {encoding: 'utf8'});
	console.log('code loaded, %d chars, %d lines', code.length, code.trimEnd().split('\n').length);

	const result = await blockchain.deployContract(code, contract.init);

	if(result) {
		console.log('success, deployment txid: %s, contract address: %s', result.tx.id, result.address);
	}
	else {
		console.log('deployment failed');
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
	console.log('%s => %s.%s()', callerName, contractName, transition);
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
	console.log('done, tx.id:', tx.id);
	if(!tx.isConfirmed())
		throw new Error('tx is not confirmed!');
}

async function showState(contractName) {
	console.log('state of contract %s:', contractName);
	const state = await blockchain.getState(config.contracts[contractName].address);
	const stateString = JSON.stringify(state, null, 2).replace(/"(0x[0-9a-f]{40})"/gi, (match, addr) => ('address:'+addressToName(addr)));
	console.log(stateString);
	return state;
}

async function runServer() {
	console.log('running server');
}

async function pause(msg, delay) {
	const stdin = process.stdin;
	process.stdout.write(msg + '\n');
	return new Promise((resolve, reject) => {
		if(delay)
			setTimeout(() => {
				stdin.setRawMode(false);
				resolve('timeout');
			}, delay);
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');
		stdin.on('data', s => {
			stdin.setRawMode(false);
			resolve(s);
		});
	});
}

async function runScenario() {
	let state;
	await callTransition('stableCoinOwner', 'stableCoin', 'Transfer', {to: 'user', tokens: '100000000', code: '0'});
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
	await showState('dBonds');
	await pause('press a key to continue');
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
			"https://goo-gl.su/m99d1"
		]
	}});
	await showState('dBonds');
	await callTransition('dBondsOwner', 'dBonds', 'FreezeTillVer', {});
	await showState('dBonds');
	await callTransition('dBondVerifier', 'dBonds', 'VerifyDBond', {});
	await showState('dBonds');
	await callTransition('swapContractOwner', 'swapContract', 'AddDBond', {
		db_contract: config.contracts.dBonds.address,
		dbond: {
			"argtypes": [],
			"arguments": [
				{
					"argtypes": [],
					"arguments": [
						"1602324610",
						"US25152R5F60"
					],
					"constructor": "FiatBondCon"
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
				"https://goo-gl.su/m99d1"
			],
			"constructor": "FcdbCon"
		}
	});
	await showState('swapContract');
	await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: "1602300001" });
	await showState('timeOracle');
	await callTransition('user', 'dBonds', 'RequestTime', {});
	await showState('dBonds');
	await callTransition('user', 'dBonds', 'GetUpdCurPrice', {});
	await showState('dBonds');
	await callTransition('dBondsOwner', 'dBonds', 'Transfer', {to: 'user', tokens: "9", code: "0"});
	state = await showState('dBonds');
	const cur_price = state.cur_price;
	// const cur_price = 10000;
	await callTransition('user', 'stableCoin', 'Transfer', {to: 'dBondsOwner', tokens: (cur_price * 9).toString(), code: '0'});
	await showState('stableCoin');
	await callTransition('dBondsOwner', 'dBonds', 'Transfer', {to: 'swapContract', tokens: '1', code: '3'});
	await showState('dBonds');

	await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: "1602301000"});
	await showState('timeOracle');
	await callTransition('user', 'dBonds', 'RequestTime', {});
	await showState('dBonds');
	await callTransition('user', 'dBonds', 'GetUpdCurPrice', {});
	await showState('dBonds');

	await callTransition('stableCoinOwner', 'stableCoin', 'Transfer', {to: 'dBondsOwner', tokens: '100000000', code: '0'});

	state = await showState('dBonds');
	await callTransition('dBondsOwner', 'stableCoin', 'Transfer', {to: 'dBonds', tokens: (parseInt(state.dbond.arguments[5]) * 9).toString(), code: '1'});
	await showState('stableCoin');

	await callTransition('user', 'dBonds', 'Transfer', {to: 'swapContract', tokens: '9', code: '4'});
	await showState('dBonds');

	await callTransition('timeOracleOwner', 'timeOracle', 'UpdateTime', { new_timestamp: '1602324000'});
	await showState('timeOracle');

	await callTransition('user', 'dBonds', 'RequestTime', {});
	await showState('dBonds');

	process.exit(0);
}
