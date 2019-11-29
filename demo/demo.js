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
	console.log('%s => %s.%s(), args:', callerName, contractName, transition, args);
	if(!config.accounts[callerName])
		new Error('unknown caller name ' + callerName);
	const caller = config.accounts[callerName];
	if(!config.contracts[contractName])
		new Error('unknown contract name ' + contractName);
	const contract = config.contracts[contractName];
	if(!contract.transitions[transition])
		new Error('unknown transition ' + transition);
	const vnames = contract.transitions[transition];
	const argsArray = [];
	for(let vname in vnames) {
		if(!args[vnames] == undefined)
			new Error('undefined argument ' + vname);
		const v = { vname, type: vnames[vname], value: args[vname] };
		if(v.type == 'ByStr20' && v.value.slice(0, 2) != '0x')
			v.value = config.accounts[v.value].address;
		argsArray.push(v);
	}
	const tx = await blockchain.runTransition(contractName, transition, argsArray, callerName);
	console.log('done, tx.id:', tx.id);
}

async function showState(contractName) {
	const state = await blockchain.getState(config.contracts[contractName].address);
	console.log(JSON.stringify(state, null, 2));
}

async function runServer() {
	console.log('running server');
}

async function runScenario() {
	await callTransition('stableCoinOwner', 'stableCoin', 'Transfer', {to: 'user', tokens: '100000000', code: '0'});
}
