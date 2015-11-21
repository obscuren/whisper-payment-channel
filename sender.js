var account = shh.newIdentity()
    // name of our application
    name = "payment_channels";
    // The content we're selling
    numbers = [1,2,3,3,4,5,6,7,3,4,8,9,10,100,21,84,12]
    index = 0;

console.log(name, "ID:", account);

// post part of our numbers
function post(payload) {
	// either run out of numbers or quit randomly
	if( index == numbers.length) {
		console.log("done")
		return;
	}
	shh.post({topics:[name, "deliver"], from: account, to: payload.from, payload: numbers[index]});
	index++;
}

// payment filter
shh.filter({to: account, topics:[name, "payment"]}, function(err, res) {
	console.log("payment received on channel");
	post(res);
});

// initial filter 
shh.filter({to: account, topics:[name, "ready"]}, function(err, res) {
	post(res);
});

// setup filter
shh.post({topics:[name, "setup"], from: account, payload: numbers.length});
