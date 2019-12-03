#!/bin/bash

. ./scripts/functions.sh

function print_usage_and_exit
{
    echo "Usage: $0 contract_dir test_number"
    exit 1
}

function run_test() {
	export dir
	if [ $# != 1 ] ; then
		print_usage_and_exit
	fi
	test_dir="$1"

	if [[ ! -f $test_dir/state.json ]] ; then
		echo "Test $i does not exist"
		print_usage_and_exit
	fi

	if [[ -f $test_dir/init.json ]] ; then
		init=$test_dir/init.json
	else
		init=$test_dir/../init.json
	fi

	title "running test in $test_dir" 

	messages=`scilla-runner \
		-init $init \
		-istate $test_dir/state.json \
		-imessage $test_dir/message.json \
		-iblockchain $test_dir/blockchain.json \
		-i $test_dir/../../$dir.scilla \
		-o $test_dir/output.json \
		-gaslimit 8000 2>&1`

	status=$?

	if test $status -eq 0
	then
		# result=`jq --argfile a $test_dir/output.json --argfile b $test_dir/output_expected.json -n 'def post_recurse(f): def r: (f | select(. != null) | r), .; r; def post_recurse: post_recurse(.[]?); ($a | (post_recurse | arrays) |= sort) as $a | ($b | (post_recurse | arrays) |= sort) as $b | $a == $b'`
		result=`scripts/jscmp.js $test_dir/output_expected.json $test_dir/output.json`
		if [ $? != 0 ] ; then
			print_error "test failed"
			echo "$result"
			exit 1
		fi
	else
		if echo "$messages" | grep -q 'Exception thrown' ; then
			if echo "$messages" | grep -q `cat $test_dir/exception_expected.txt` ; then
				true
			else
				print_error "got wrong exception: $messages"
				exit $status
			fi
		else
			print_error "scilla-runner failed: $messages"
			exit $status
		fi
	fi
}

dir=$1
shift
if [ "$1" = all ] ; then
	for i in $dir/tests/*-*
	do
		run_test $i
	done
else
	test_dir=$(echo "$dir/tests/$1-"*)
	run_test $test_dir
fi
