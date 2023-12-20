export default class RespHandler {
	name = "RespHandler"
	code = 500
	message = "Error"
	data = null
	constructor(res) {
		this.res = res
	}

	params (code, message, data) {
		this.code = code;
		this.message = message;
		if (data) this.data = data;
		return this;
	}

	send () {
		this.res.status(this.code).json({
			status: {
				success: this.code < 299 ? true : false,
				msg: this.message
			},
			...this.data
		});
	}
}