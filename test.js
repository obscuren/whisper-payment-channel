loadScript("/Users/jeffrey/dev/ethereum/payment_channel/payment_channel.js");

personal.unlockAccount(eth.accounts[0], "")
personal.unlockAccount(eth.accounts[1], "")

var receiver = shh.newIdentity()
    sender = shh.newIdentity()
    numbers = [3,1,4,1,5,9,2,6,5,3,5,8,9,7,9,3,2,3,8];
    index = 0;

var tx = new PaymentChannel({
    account: eth.accounts[0], 
    me: sender,
    them: receiver,
    role: PaymentChannel.payer,
    payment: {
        value: web3.toWei(2, "ether"),
        base: web3.toWei(1, "ether"),
        inc: 100000,
    },
});
tx.onPayload = function(payload) {
    console.log("received data", payload);
    return true;
};

var rx = new PaymentChannel({
    account: eth.accounts[1],
    me: receiver,
    them: sender,
    role: PaymentChannel.beneficiary,
    payment: {
        base: web3.toWei(1, "ether"),
        inc: 100000,
    },
});
rx.onPayment = function(error, payment) {
    if( error ) {
        console.log("invalid payment:", error);
        return false;
    }

    console.log("received payment", payment);
    return true;
};
rx.data = function() {
	// either run out of numbers or quit randomly
	if( index == numbers.length) {
		console.log("done")

        rx.redeem();

		return false;
	}
    return web3.toHex(numbers[index++]);
}

tx.start();
rx.start();
