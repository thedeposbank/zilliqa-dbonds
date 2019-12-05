async function pause(msg, delay) {
	const stdin = process.stdin;
	process.stdout.write(msg + '\n');
	return new Promise((resolve, reject) => {
		if(delay)
			setTimeout(() => {
				stdin.setRawMode(false);
				resolve(msg+': timeout');
			}, delay);
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');
		stdin.on('data', s => {
			stdin.setRawMode(false);
			resolve(s);
			if(s == 'q') {
				console.log('exit');
				process.exit(2);
			}
		});
	});
}

async function main() {
	const s = await pause('sdfsdf');
	console.log('pressed "%s"', s);
}

main();
