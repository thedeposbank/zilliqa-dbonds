#!/usr/bin/node

'use strict';

if(process.argv.length < 3) {
	console.error('usage: jscmp.js <file1.json> <file2.json>');
	process.exit(1);
}

const fs = require('fs');
const json1 = JSON.parse(fs.readFileSync(process.argv[2], {encoding:'utf8'}));
const json2 = JSON.parse(fs.readFileSync(process.argv[3], {encoding:'utf8'}));

delete json1.gas_remaining;
delete json2.gas_remaining;

// do not sort values of 'argtypes' and 'arguments' properties
function sequenceSensitive(propertyName) {
	return ['argtypes', 'arguments'].some(s => s == propertyName);
}

// sort arrays and objects inside of given object and return its string representation
function normalize(o, sort = false) {
	if(typeof o == 'string' || typeof o == 'number' || typeof o == 'boolean' || o === null)
		return JSON.stringify(o);
	if(o instanceof Array) {
		const result = o.map(e => normalize(e));
		if(sort)
			result.sort();
		return '[' + result.join(',') + ']';
	}
	if(o instanceof Object) {
		const entries = Object.entries(o);
		entries.sort((a, b) => a[0] > b[0]);
		return '{' + entries.map(entry => '"' + entry[0] + '":' +
			normalize(entry[1], !sequenceSensitive(entry[0]))).join(',') + '}';
	}
}

function printDiff(j1, j2, prefix) {
	const s1 = JSON.stringify(j1);
	const s2 = JSON.stringify(j2);
	console.log(`${prefix}: ${s1} !== ${s2}`);
}

function indexName(p) {
	const re = /^[a-zA-Z_]\w*$/;
	if(re.test(p))
		return '.' + p;
	return '[' + JSON.stringify(p) + ']';
}

function cmp(j1, j2, prefix) {
	if( typeof j1 == 'string' &&
		typeof j2 == 'string' &&
		j1.slice(0, 2) == '0x' &&
		j2.slice(0, 2) == '0x' &&
		j1.toLowerCase() == j2.toLowerCase())
			return true;
	if(typeof j1 == 'string' || typeof j1 == 'number' || typeof j1 == 'boolean') {
		if(j1 !== j2) {
			printDiff(j1, j2, prefix);
			return false;
		}
		return true;
	}
	if(j1 instanceof Array) {
		if(j2 instanceof Array && j1.length == j2.length) {
			for(let i = 0; i < j1.length; i++)
				if(!cmp(j1[i], j2[i], prefix + '[' + i + ']'))
					return false;
			return true;
		}
		printDiff(j1, j2, prefix);
		return false;
	}
	if(j1 instanceof Object && j1 !== undefined) {
		if(j2 instanceof Object && !(j2 instanceof Array) && j2 !== undefined) {
			for(let p in j1)
				if(!cmp(j1[p], j2[p], prefix + indexName(p)))
					return false;
			return true;
		}
		printDiff(j1, j2, prefix);
		return false;
	}
	if(j1 === null || j1 === undefined) {
		if(j1 === j2)
			return true;
		printDiff(j1, j2, prefix);
	}
	console.log('unknown type?');
	printDiff(j1, j2, prefix);
	return false;
}

const norm1 = JSON.parse(normalize(json1));
const norm2 = JSON.parse(normalize(json2));

const result = cmp(norm1, norm2, '');
if(result)
	process.exit(0);
process.exit(1);
