#!/bin/bash

. ./scripts/functions.sh

title checking

scilla-checker -gaslimit 2000 ${sdir}/${contract}.scilla 
