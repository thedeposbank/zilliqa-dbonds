all: check test

test:
# 	./scripts/easyrun.sh StableCoinSimulator all
	./scripts/easyrun.sh SwapContract all
# 	./scripts/easyrun.sh TimeOracle all
	./scripts/easyrun.sh dBonds all

check:
	./scripts/check.sh

deploy:
	./scripts/deploy.sh
