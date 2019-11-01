all: check test

test:
	./scripts/easyrun.sh all

check:
	./scripts/check.sh

deploy:
	./scripts/deploy.sh
