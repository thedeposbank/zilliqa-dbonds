#!/bin/bash

contract=dBonds
sdir="."
cdir="tests"

function print_usage_and_exit
{
    echo "Usage: $0 test_number"
    exit 1
}

function title() {
	title="# $1 #"
	hashes=`echo "$title" | tr '[\040-\377]' '[#*]'`
	echo
	echo -e "\e[32m$hashes\e[0m"
	echo -e "\e[32m$title\e[0m"
	echo -e "\e[32m$hashes\e[0m"
}
