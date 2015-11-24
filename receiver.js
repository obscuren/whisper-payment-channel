admin.addPeer("enode://93ce73e855301e6ad89030f4d89599d9501e73f85a4b31e8d6ac469863ce20cc4248621b8976ac70dd3516db3b83d78fbb28da7d8ad10b86a7abe873e91fe008@127.0.0.1:30303")
personal.unlockAccount(eth.accounts[0], "");

// hardcoded path. change this!
loadScript("/Users/jeffrey/dev/ethereum/payment_channel/util.js");

var i = 0
    // name of our application
    name = "payment_channels";
    // The base fee
    initial = 100
    // incremental fee
    increment = 10
    account = shh.newIdentity();

// Timeout handler. Creates a new timeout for each payment request.
function createTimeout(channel) {
	return setTimeout(function() {
		channel.stopWatching();

		console.log("Payment timeout. Stop sending payments");
	}, 2000);
}

// setup filter
var id = shh.filter({topics: [name, "setup"]}, function(error, res) {
	console.log("Payment channel started. Funneling funds to:", res.payload);

    var recipient = res.payload;

    // get the nonce
	var nonce = eth.getTransactionCount(eth.accounts[0]);

    var filter = channel.NewChannel({owner: eth.accounts[0]}, function(e, ev) {
        console.log("new channel created:");
        inspect(res);

        // let the other side know we're ready for receiving content
        shh.post({to: res.from, from: account, topics:[name, "ready"], payload: ev.args.channel});


        // timeout variable for timing out payments
        var timeout;
        // delivery channel
        var paymentChannel = shh.filter({topics:[name, "deliver"], from: res.from}, function(error, res) {
            if( timeout ) {
                // clear previous timeout
                clearTimeout(timeout);
            }

            console.log("Content (", res.payload, ") received. Paying using channel");

            var amount = initial + (increment * i);
            // create transaction for the payment channel
            var payment = JSON.stringify({sig: sign(ev.args.channel, eth.accounts[0], recipient, amount), amount: amount});
            // broadcast payment to recipient
            shh.post({topics:[name, "payment"], to: res.from, from: account, payload: payment});

            // update timeout handler
            timeout = createTimeout(paymentChannel);
        });
    });
    channel.createChannel({from:eth.accounts[0], gas:1000000});

    // setup initial timeout handler
	//timeout = createTimeout(paymentChannel);
});
