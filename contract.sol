contract Channel {
	address public owner;

	function Channel() {
		owner = msg.sender;
	}

	// creates a hash using the recipient and amount.
	function getHash(address recipient, uint amount) constant returns(bytes32) {
		return sha3(recipient, amount);
	}

	// verify a message (receipient || amount) with the provided signature
	function verify(address recipient, uint amount, uint8 v, bytes32 r, bytes32 s) constant returns(bool) {
		return owner == ecrecover(getHash(recipient, amount), v, r, s);
	}

	// claim funds
	function claim(address recipient, uint amount, uint8 v, bytes32 r, bytes32 s) {
		if( !verify(recipient, amount, v, r, s) ) return;

		// TODO checking for sufficient funds
		recipient.send(amount);
	}

	// deposit
	event Deposit(address indexed who);
	function() {
		Deposit(msg.sender);
	}
}

