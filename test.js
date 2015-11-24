loadScript("/Users/jeffrey/dev/ethereum/payment_channel/payment_channel.js");

personal.unlockAccount(eth.accounts[0], "")

var receiver = shh.newIdentity()
    sender = shh.newIdentity()
    numbers = [1,2,3,3,4,5,6,7,3,4,8,9,10,100,21,84,12]
    index = 0;

var tx = new PaymentChannel(eth.accounts[0], sender, receiver, PaymentChannel.payer);
tx.onPayload = function(payload) {
    console.log("received data", payload);
    return true;
};
var rx = new PaymentChannel(eth.accounts[0], receiver, sender, PaymentChannel.beneficiary);
rx.onPayment = function(error, payment) {
    console.log("received payment", payment);
    // post next
    this.post();
};
rx.onPost = function() {
	// either run out of numbers or quit randomly
	if( index == numbers.length) {
		console.log("done")
		return false;
	}
    return web3.toHex(numbers[index++]);
}

tx.start();
rx.start();
