contract Channel {
	address public owner;
	mapping(bytes32 => bool) public channels;
	uint id;

	function Channel() {
		owner = msg.sender;
		id = 0;
	}

	event NewChannel(bytes32 indexed channel);
	function createChannel() {
		bytes32 channel = sha3(id++);
		channels[channel] = true;

		NewChannel(channel);
	}

	// creates a hash using the recipient and amount.
	function getHash(bytes32 channel, address recipient, uint amount) constant returns(bytes32) {
		return sha3(channel, recipient, amount);
	}

	// verify a message (receipient || amount) with the provided signature
	function verify(bytes32 channel, address recipient, uint amount, uint8 v, bytes32 r, bytes32 s) constant returns(bool) {
		return channels[channel] && owner == ecrecover(getHash(channel, recipient, amount), v, r, s);
	}

	// claim funds
	function claim(bytes32 channel, address recipient, uint amount, uint8 v, bytes32 r, bytes32 s) {
		if( !verify(channel, recipient, amount, v, r, s) ) return;

		// TODO checking for sufficient funds
		recipient.send(amount);

		delete channels[channel];
	}

	// deposit
	event Deposit(address indexed who);
	function() {
		Deposit(msg.sender);
	}
}

