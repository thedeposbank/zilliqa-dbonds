'use strict';

const accounts = {
	dBondsOwner: {
		privateKey: '401ae450de182f5c01b33db86a073e4cc10d02aa5a4999a66260b2ef41ae9ff7',
		address: '0xC260F2C046eC08A51bB1Cc9D1fd3f97CFF189617',
		bech32Address: 'zil1cfs09szxasy22xa3ejw3l5le0nl339sh76905p'
	},
	swapContractOwner: {
		privateKey: '83df11302a8a14662784e6c1ecf16972ea3e6dd48a2d261b06f035339c22258a',
		address: '0x010Fc1CD4f7DfCB6D2865aFe7A72f35dd64aA12B',
		bech32Address: 'zil1qy8urn200h7td55xttl85uhnthty4gft5c7sky'
	},
	stableCoinOwner: {
		privateKey: '0d19351439e593a1aa142db61591f0e83f9cc6b97d3ef4466bc9ed0e4d81dc25',
		address: '0x86FD18E650b07053F538D0Ac55F18D8e33604042',
		bech32Address: 'zil1sm733ejskpc98afc6zk9tuvd3cekqszzwxcvde'
	},
	timeOracleOwner: {
		privateKey: 'f9c2f376e183d0eb010cc473805807df3fbcd67aa3928ad346cc138672f09c36',
		address: '0x49bEa10843F17E1D91f4793dA3a46c0038a825BA',
		bech32Address: 'zil1fxl2zzzr79lpmy050y768frvqqu2sfd6kwnyj7'
	},
	dBondVerifier: {
		privateKey: 'd21fb21eb992e6ecbf38d7c91c1abc76c296da3f8694b1379a1a443b27d5641c',
		address: '0xA66450AA4e7217436E285C1c1E2D5153A1F425A2',
		bech32Address: 'zil15ej9p2jwwgt5xm3gtswput232wslgfdzfh2udx'
	},
	counterParty: {
		privateKey: 'e1b5b216f4995e529cfa609798a02638ac57af4d28a6c8da1a9ad3e87e3e4de2',
		address: '0x12d9387AE8942a90086782Ed8f272d68F75Cd7f1',
		bech32Address: 'zil1ztvns7hgjs4fqzr8stkc7feddrm4e4l300u32l'
	},
	liquidationAgent: {
		privateKey: '9ea05ec34168657bfe74831155b3a7f1949da98c7b0dab879c60137831ac5436',
		address: '0x9388cAffC518484C55A3DfC0A476CD4fDe35Dc59',
		bech32Address: 'zil1jwyv4l79rpyyc4drmlq2gakdfl0rthzexc56u4'
	},
	user: {
		privateKey: 'f18235f54c8cd56422f3d209af209e3d5970ec0548d9629532703cfbd412fe86',
		address: '0x4bb25dBeE278adbFaA277b9D07DAf6252064f400',
		bech32Address: 'zil1fwe9m0hz0zkml2380wws0khky5sxfaqqyc3fhw'
	}
};

const contractAddresses = require('./contract_addrs.json');

const config = {
	accounts,
	deployer: accounts.dBondsOwner,
	apiUrl: 'https://dev-api.zilliqa.com/',
	chainId: 333,
	dbondStates: [
		'not issued',
		'frozen till verification',
		'issued',
		'expired, paid off',
		'expired, tech. defaulted',
		'expired, liquidated',
		'expired, defaulted'
	],
	transferCodes: [
		'simple transfer',
		'pay off',
		'liquidation',
		'dbond deposit',
		'dbond exchange'
	],
	contracts: {
		dBonds: {
			fileName: '../dBonds/dBonds.scilla',
			address: contractAddresses.dBonds,
			init: [
				{ 
					vname: "_scilla_version",
					type: "Uint32",
					value: "0"
				},
				{
					vname: "owner",
					type: "ByStr20", 
					value: accounts.dBondsOwner.address.toLowerCase()
				},
				{
					vname: "decimals",
					type: "Uint32" ,
					value: "4"
				},
				{ 
					vname: "name",
					type: "String",
					value: "blahblah"
				},
				{
					vname: "symbol",
					type: "String",
					value: "DBAAAAA"
				},
				{
					vname: "time_oracle",
					type: "ByStr20",
					value: contractAddresses.timeOracle.toLowerCase()
				},
				{
					vname: "swap_contract",
					type: "ByStr20",
					value: contractAddresses.swapContract.toLowerCase()
				}
			],
			transitions: {
				CreateUpdateDBond: {
					init_dbond: 'Fcdb'
				},
				FreezeTillVer: {},
				VerifyDBond: {},
				RequestTime: {},
				GetUpdCurPrice: {},
				Transfer: {
					to: 'ByStr20',
					tokens: 'Uint128',
					code: 'Uint32'
				},
				ClaimDefault: {}
			},
			state: {}
		},
		stableCoin: {
			fileName: '../StableCoinSimulator/StablecoinSimulator.scilla',
			address: contractAddresses.stableCoin,
			init: [
				{ 
					vname: "_scilla_version",
					type: "Uint32",
					value: "0"
				},
				{
					vname: "owner",
					type: "ByStr20", 
					value: accounts.stableCoinOwner.address.toLowerCase()
				},
				{
					vname: "total_tokens",
					type: "Uint128", 
					value: "100000000000"
				},
				{
					vname: "decimals",
					type: "Uint32", 
					value: "2"
				},
				{
					vname: "name",
					type: "String", 
					value: "DUSD"
				},
				{
					vname: "symbol",
					type: "String", 
					value: "DUSD"
				}
			],
			transitions: {
				Transfer: {
					to: 'ByStr20',
					tokens: 'Uint128',
					code: 'Uint32'
				}
			},
			state: {}
		},
		swapContract: {
			fileName: '../SwapContract/SwapContract.scilla',
			address: contractAddresses.swapContract,
			init: [
				{ 
					vname: "_scilla_version",
					type: "Uint32",
					value: "0"
				},
				{
					vname: "owner",
					type: "ByStr20", 
					value: accounts.swapContractOwner.address.toLowerCase()
				}
			],
			transitions: {
				AddDBond: {
					db_contract: 'ByStr20',
					dbond: 'Fcdb'
				}
			},
			state: {}
		},
		timeOracle: {
			fileName: '../TimeOracle/TimeOracle.scilla',
			address: contractAddresses.timeOracle,
			init: [
				{ 
					vname: "_scilla_version",
					type: "Uint32",
					value: "0"
				},
				{
					vname: "owner",
					type: "ByStr20", 
					value: accounts.timeOracleOwner.address.toLowerCase()
				}
			],
			transitions: {
				UpdateTime: {
					new_timestamp: 'Uint32'
				}
			},
			state: {}
		}
	},
	tests: {
		CreateUpdateDBond: {
			contractName: 'dBonds',
			transition: 'CreateUpdateDBond',
			args: [
				{
					vname: "init_dbond",
					"type"  : "Fcdb",
					value: {
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
							"0xdeadbeefdeadbeef000000000000000000000001",
							"10000",
							"0xdeadbeefdeadbeef000000000000000000000002",
							"0xdeadbeefdeadbeef000000000000000000000003",
							"0xdeadbeefdeadbeef000000000000000000000004",
							"300",
							"http://sdfsdf.com/sdfsdf"
						]
					}
				}
			]
		}
	}
};

// const privateConfig = require('./config-private.js');
// Object.assign(config, privateConfig);

module.exports = config;
