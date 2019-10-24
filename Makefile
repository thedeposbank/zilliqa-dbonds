all: check test

test:
	./scripts/easyrun.sh 1

check:
	./scripts/check.sh

deploy:
	./scripts/deploy.sh
