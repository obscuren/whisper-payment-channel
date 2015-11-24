# Whisper payment channels

### Payment channels using whisper

This "DApp" is missing all frontend stuff. Simple open a geth client and load in
the test.js file. Make sure you deploy the contract and set the correct contract
address in payment_channel.js (this will change!)

#### Dox

Setting up payer:

```javascript
// create a new payment channel on the payer side
var tx = new PaymentChannel({
    account: eth.accounts[0],  // set eth account
    me: sender,                // my whisper id
    them: receiver,            // their whisper id
    role: PaymentChannel.payer,
    payment: {
        value: web3.toWei(2, "ether"), // value for the payment channel
        base: web3.toWei(1, "ether"),  // base cost
        inc: 100000,                   // incremental amount
    },
});
tx.onPayload = function(payload) {
    return true; // keep paying the beneficiary
};
```

Setting up beneficiary:

```javascript
var rx = new PaymentChannel({
    account: eth.accounts[1],   // set eth account (to which the payment goes on the eth network)
    me: receiver,               // my whisper id
    them: sender,               // their whisper id
    role: PaymentChannel.beneficiary,
    payment: {
        base: web3.toWei(1, "ether"), // min accepted base fee
        inc: 100000,                  // min accepted inc fee
    },
});
// set payment callback
rx.onPayment = function(error, payment) {
    if( error ) {
        console.log("invalid payment:", error);
        return false;
    }
    return true; // keep accepting more more payments for more data
};
rx.data = myDataFunction; // some data function which returns data (false == done)
```

Fire them up:

```javascript
tx.start();
rx.start();
```
