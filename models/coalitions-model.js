import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const Scores = new Schema(
	{
		login: { type: String, required: true },
		score: { type: Number, required: true },
		date: { type: Date, required: true }
	},
	{ _id: false }
);

const Coalitions = new Schema(
    {
        name: { type: String, required: true },
        scores: { type: [Scores], required: false }
    },
    { timestamps: true }
)

export default mongoose.model('coalitions', Coalitions);