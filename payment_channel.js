var channelContract = web3.eth.contract([{"constant":true,"inputs":[{"name":"channel","type":"bytes32"}],"name":"isValidChannel","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[],"name":"createChannel","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"channel","type":"bytes32"},{"name":"recipient","type":"address"},{"name":"value","type":"uint256"},{"name":"v","type":"uint8"},{"name":"r","type":"bytes32"},{"name":"s","type":"bytes32"}],"name":"verify","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"channel","type":"bytes32"},{"name":"recipient","type":"address"},{"name":"value","type":"uint256"},{"name":"v","type":"uint8"},{"name":"r","type":"bytes32"},{"name":"s","type":"bytes32"}],"name":"claim","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"channels","outputs":[{"name":"owner","type":"address"},{"name":"value","type":"uint256"},{"name":"validUntil","type":"uint256"},{"name":"valid","type":"bool"}],"type":"function"},{"constant":true,"inputs":[{"name":"channel","type":"bytes32"}],"name":"getChannelValidUntil","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"channel","type":"bytes32"}],"name":"reclaim","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"channel","type":"bytes32"},{"name":"recipient","type":"address"},{"name":"value","type":"uint256"}],"name":"getHash","outputs":[{"name":"","type":"bytes32"}],"type":"function"},{"constant":true,"inputs":[{"name":"channel","type":"bytes32"}],"name":"getChannelOwner","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"channel","type":"bytes32"}],"name":"deposit","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"channel","type":"bytes32"}],"name":"getChannelValue","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"channel","type":"bytes32"}],"name":"NewChannel","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"channel","type":"bytes32"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"},{"indexed":true,"name":"channel","type":"bytes32"}],"name":"Claim","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"channel","type":"bytes32"}],"name":"Reclaim","type":"event"}]);
var channel = channelContract.at("0xb8f4e68312f7e730e74394a97b70599751251f0b");

function sign(c, account, recipient, value) {
	var sig = eth.sign(account, channel.getHash(c, recipient, value));
	sig = sig.substr(2, sig.length);

	var res = {};
	res.r = "0x" + sig.substr(0, 64);
	res.s = "0x" + sig.substr(64, 64);
	res.v = web3.toHex( web3.toDecimal(sig.substr(128, 2)) + 27 );

	return res
}

var PaymentChannel = function(opts) {
    if( opts.role !== PaymentChannel.payer && opts.role !== PaymentChannel.beneficiary ) {
        throw "PaymentChannel requires role to be set to either 'beneficiary' or 'payer'";
    }

    this.account = opts.account;
    this.recipient = undefined;
    this.me = opts.me;
    this.them = opts.them;
    this.role = opts.role;
    this.numPays = 0;
    this.channelId = undefined;
    this.payment = opts.payment;
    if( this.payment === undefined )
        this.payment = {};
}

PaymentChannel.prototype.start = function() {
    if( this.role === PaymentChannel.beneficiary )
        this.setupBeneficiary();
    else
        this.setupPayer();
}

PaymentChannel.prototype.onPayload = function(){console.log("onPayload not set");};
PaymentChannel.prototype.onPayment = function(){console.log("onPayment not set");};
PaymentChannel.prototype.data = function(){console.log("data not set"); return false;};

PaymentChannel.prototype.getData = function() {
    if( typeof this.data === "function" )
        return this.data();
    else if( typeof this.data === "object" )
        return JSON.stringify( this.data );
    else if( typeof this.data === "string" )
        return web3.toHex( this.data );
    else 
        return this.data;
};

PaymentChannel.prototype.post = function() {
    var payload = this.getData();
    if( payload === false ) {
        shh.post({
            from: this.me,
            to: this.them,
            topics:[PaymentChannel.name, paymentChannel.channelId, "done"],
        });
        return;
    } else {
        shh.post({from: this.me, to: this.them, topics:[PaymentChannel.name, this.channelId, "deliver"], payload: payload});
    }
};

PaymentChannel.prototype.setupBeneficiary = function() {
    shh.post({topics:[PaymentChannel.name, "setup"], from: this.me, to: this.them, payload:this.account});
    var paymentChannel = this;

    paymentChannel.readyFilter = shh.filter({from: paymentChannel.them, to: paymentChannel.me, topics:[PaymentChannel.name, "ready"]}, function(err, res) {
        paymentChannel.channelId = res.payload;

        paymentChannel.paymentFilter = shh.filter({to: paymentChannel.me, from: paymentChannel.them, topics:[PaymentChannel.name, paymentChannel.channelId, "payment"]}, function(err, res) {
            var payment = JSON.parse(web3.toAscii(res.payload));

            var error;
            if( !channel.verify(paymentChannel.channelId, paymentChannel.account, payment.value, payment.sig.v, payment.sig.r, payment.sig.s) ) {
                error = "Payment received invalid";
            } else if( channel.getChannelValue(paymentChannel.channelId) < payment.value ) {
                error = "Channel has insufficient funds";
            } else if( paymentChannel.lastPayment ){
                var last = paymentChannel.lastPayment;

                var lastv = new BigNumber(last.value)
                    newv  = new BigNumber(payment.value);
                if( lastv.greaterThanOrEqualTo(newv) ) {
                    error = "Last payment greater or equal to current";
                } else if( newv.minus(lastv).lessThan(new BigNumber(paymentChannel.payment.inc)) ) {
                    error = "Increment too low (" + payment.value + " - " + last.value + " < " + paymentChannel.payment.inc;
                }
            } else {
                if( payment.value < paymentChannel.payment.base ) {
                    error = "Base payment is too low";
                }
            }
            paymentChannel.lastPayment = payment;

            if( paymentChannel.onPayment(error, payment) ) {
                paymentChannel.post();
            }
        });
        paymentChannel.post();
    });
};

PaymentChannel.prototype.setupPayer = function() {
    var paymentChannel = this;

    paymentChannel.negotiateFilter = shh.filter({from: paymentChannel.them, to: paymentChannel.me, topics: [PaymentChannel.name, "setup"]}, function(error, res) {
        paymentChannel.recipient = res.payload;
        // setup new channel
        paymentChannel.newChannelFilter = channel.NewChannel({owner: paymentChannel.account}, function(e, ev) {
            // set the payment channel id
            paymentChannel.channelId = ev.args.channel;

            // let the other side know we're ready for receiving content
            shh.post({
                from: paymentChannel.me,
                to: paymentChannel.them,
                topics:[PaymentChannel.name, "ready"],
                payload: ev.args.channel
            });
            // create whisper channel
            paymentChannel.createChannel(ev.args.channel);
        });
        // create channel on ethereum network
        channel.createChannel({from:paymentChannel.account, value: paymentChannel.payment.value, gas:1000000});
    });
};

PaymentChannel.prototype.createChannel = function(channelName) {
    var paymentChannel = this;
    // timeout variable for timing out payments
    var timeout;

    // delivery channel
    paymentChannel.deliveryFilter = shh.filter({from: paymentChannel.them, to: paymentChannel.me, topics:[PaymentChannel.name, channelName, "deliver"]}, function(error, res) {
        if( timeout ) {
            // clear previous timeout
            clearTimeout(timeout);
        }
        if( !paymentChannel.onPayload.call(paymentChannel, res.payload) ) {
            paymentChannel.cancel();
            return;
        }

        var p = paymentChannel.payment;

        var value = p.base + (p.inc * paymentChannel.numPays);
        // create transaction for the payment channel
        var payment = JSON.stringify({sig: sign(paymentChannel.channelId, paymentChannel.account, paymentChannel.recipient, value), value: value});
        // broadcast payment to recipient
        shh.post({
            from: paymentChannel.me,
            to: paymentChannel.them,
            topics:[PaymentChannel.name, paymentChannel.channelId, "payment"],
            payload: web3.toHex(payment),
        });
        paymentChannel.numPays++;

        // update timeout handler
        timeout = createTimeout(paymentChannel);
    });
};

PaymentChannel.prototype.redeem = function() {
    var last = this.lastPayment;

    console.log("redeeming payment");
    inspect(last);

    try {
    channel.claim(this.channelId, this.account, last.value, last.sig.v, last.sig.r, last.sig.s, {from:this.account, gas:1000000});
    } catch(e) { console.log(e); }
};

PaymentChannel.prototype.cancel = function() {
    if( this.negotiateFilter ) {
        this.negotiateFilter.stopWatching();
    }

    if( this.deliveryFilter ) {
        this.deliveryFilter.stopWatching();
    }

    if( this.newChannelFilter ) {
        this.newChannelFilter.stopWatching();
    }

    if( this.paymentFilter ) {
        this.paymentFilter.stopWatching();
    }

    if( this.readyFilter ) {
        this.readyFilter.stopWatching();
    }
}

PaymentChannel.payer = "payer";
PaymentChannel.beneficiary = "beneficiary";
PaymentChannel.name = "PaymentChannel_tIh9ChHhuBAXz3";

// Timeout handler. Creates a new timeout for each payment request.
function createTimeout(channel) {
	return setTimeout(function() {
        channel.cancel();
	}, 2000);
}
