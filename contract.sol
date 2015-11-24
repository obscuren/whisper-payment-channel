contract Channel {
	struct PaymentChannel {
		address owner;
		uint256 value;
		uint validUntil;

		bool valid;
	}
	mapping(bytes32 => PaymentChannel) public channels;
	uint id;

	event NewChannel(address indexed owner, bytes32 channel);
	event Deposit(address indexed owner, bytes32 indexed channel);
	event Reclaim(bytes32 indexed channel);

	function Channel() {
		id = 0;
	}

	function createChannel() {
		bytes32 channel = sha3(id++);
		channels[channel] = PaymentChannel(msg.sender, msg.value, block.timestamp + 1 days, true);

		NewChannel(msg.sender, channel);
	}

	// creates a hash using the recipient and amount.
	function getHash(bytes32 channel, address recipient, uint amount) constant returns(bytes32) {
		return sha3(channel, recipient, amount);
	}

	// verify a message (receipient || amount) with the provided signature
	function verify(bytes32 channel, address recipient, uint amount, uint8 v, bytes32 r, bytes32 s) constant returns(bool) {
		PaymentChannel ch = channels[channel];
		return ch.valid && ch.validUntil > block.timestamp && ch.owner == ecrecover(getHash(channel, recipient, amount), v, r, s);
	}

	// claim funds
	function claim(bytes32 channel, address recipient, uint amount, uint8 v, bytes32 r, bytes32 s) {
		if( !verify(channel, recipient, amount, v, r, s) ) return;

		PaymentChannel ch = channels[channel];
		if( amount > ch.value ) {
			recipient.send(ch.value);
			ch.value = 0;
		} else {
			recipient.send(amount);
			ch.value -= amount;
		}

		// channel is no longer valid
		channels[channel].valid = false;
	}

	function deposit(bytes32 channel) {
		if( !isValidChannel(channel) ) throw;

		PaymentChannel ch = channels[channel]; 
		ch.value += msg.value;

		Deposit(msg.sender, channel);
	}

	// reclaim a channel
	function reclaim(bytes32 channel) {
		PaymentChannel ch = channels[channel];
		if( ch.value > 0 && ch.validUntil < block.timestamp ) {
			ch.owner.send(ch.value);
			delete channels[channel];
		}
	}

	function getChannelValue(bytes32 channel) constant returns(uint256) {
		return channels[channel].value;
	}

	function getChannelOwner(bytes32 channel) constant returns(address) {
		return channels[channel].owner;
	}

	function  getChannelValidUntil(bytes32 channel) constant returns(uint) {
		return channels[channel].validUntil;
	}
	function isValidChannel(bytes32 channel) constant returns(bool) {
		PaymentChannel ch = channels[channel];
		return ch.valid && ch.validUntil >= block.timestamp;
	}
}
