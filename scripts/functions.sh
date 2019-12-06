#!/bin/bash

function title() {
	title="# $1 #"
	hashes=`echo "$title" | tr '[\040-\377]' '[#*]'`
	echo
	echo -e "\e[32m$hashes\e[0m"
	echo -e "\e[32m$title\e[0m"
	echo -e "\e[32m$hashes\e[0m"
}

function print_error() {
	echo
	echo -e "\e[31m$1\e[0m"
}
