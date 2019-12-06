To deploy and run demo you need node.js and yarn installed.

To publish the solution to testnet, run:

```sh
export DEBUG=demo
cd demo
yarnpkg install
./demo.js deploy swapContract
./demo.js deploy timeOracle
./demo.js stableCoin
./demo.js dBonds
```
copy contract addresses to corresponding fields in contract_addrs.json

To run demo:

```sh
./demo.js scenario &2>1 | tee -a log.txt
```

In browser, go to http://localhost:8080/
