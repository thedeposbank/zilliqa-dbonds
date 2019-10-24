#!/bin/bash

. ./scripts/functions.sh

title running

if [ $# != 1 ]
then
   print_usage_and_exit
fi

i=$1

if [[ ! -f ${cdir}/state_${i}.json ]]
then
    echo "Test $contract $i does not exist"
    print_usage_and_exit
fi

scilla-runner -init ${cdir}/init.json -istate ${cdir}/state_${i}.json -imessage ${cdir}/message_${i}.json -o ${cdir}/output_${i}.json -iblockchain ${cdir}/blockchain_${i}.json -i ${sdir}/${contract}.scilla -gaslimit 8000

status=$?

if test $status -eq 0
then
    echo "output.json emitted by interpreter:"
    cat ${cdir}/output_${i}.json
    echo ""
else
    echo "scilla-runner failed"
    exit $status
fi
