#!/bin/bash

. ./scripts/functions.sh

function check() {
	title "checking $1"
	scilla-checker -gaslimit 8000 $1 
}

if [ -n "$1" ] ; then
	check $1/*.scilla
else
	for i in StableCoinSimulator SwapContract TimeOracle dBonds
	do
		check $i/*.scilla
	done
fi
