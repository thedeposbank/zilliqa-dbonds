#!/bin/bash

. ./scripts/functions.sh

function print_usage_and_exit
{
    echo "Usage: $0 test_number"
    exit 1
}

function run_test() {

	if [ $# != 1 ] ; then
		print_usage_and_exit
	fi
	test_dir="$1"

	if [[ ! -f $test_dir/state.json ]] ; then
		echo "Test $i does not exist"
		print_usage_and_exit
	fi

	title "running test in $test_dir" 

	scilla-runner \
		-init tests/init.json \
		-istate $test_dir/state.json \
		-imessage $test_dir/message.json \
		-iblockchain $test_dir/blockchain.json \
		-i $contract.scilla \
		-o $test_dir/output.json \
		-gaslimit 8000

	status=$?

	if test $status -eq 0
	then
		result=`jq --argfile a $test_dir/output.json --argfile b $test_dir/output_expected.json -n 'def post_recurse(f): def r: (f | select(. != null) | r), .; r; def post_recurse: post_recurse(.[]?); ($a | (post_recurse | arrays) |= sort) as $a | ($b | (post_recurse | arrays) |= sort) as $b | $a == $b'`
		if [ "$result" != true ] ; then
			print_error "test failed"
			exit 1
		fi
	else
		print_error "scilla-runner failed"
		exit $status
	fi
}

if [ "$1" = all ] ; then
	for i in tests/*-*
	do
		run_test $i
	done
else
	test_dir=$(echo "tests/$1-"*)
	run_test $test_dir
fi
