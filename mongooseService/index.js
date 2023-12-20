import mongoose from 'mongoose'

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => {
		console.log("Successfully connected to MongoDB");
	  })
	.catch(err => {
		console.error('MongoDB connection error:', err.message)
	})

const db = mongoose.connection

export default db;

