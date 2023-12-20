import 'dotenv/config'
import Coalitions from '../models/coalitions-model.js'
import db from '../mongooseService/index.js'
import extractorCoal from './extractorCoals.js'

export default async function startUpdate() {
	try {
		console.time("updateService");
		db.on('error', console.error.bind(console, 'MongoDB connection error:'))

		const deadlines = await Coalitions.find({}).then(function (coalitions) {
			var coalitionsUpdate = [];
			coalitions.forEach(function (coal) {
				const lastScore = coal.scores[coal.scores.length - 1];
				if (!lastScore)
					coalitionsUpdate.push({ name: coal.name, date: null })
				else
					coalitionsUpdate.push({ name: coal.name, date: lastScore.date })
			})
			return coalitionsUpdate;
		});

		console.log("Deadlines :");
		console.log(deadlines);

		const extracted = await extractorCoal(deadlines, process.env.INTRA_LOGIN, process.env.INTRA_PASSWORD);

		extracted.forEach(async (coalitonExtracted) => {
			console.log("Total new elements for :", coalitonExtracted.name, " ", coalitonExtracted.totalNewElements);
			try {
				await Coalitions.updateOne(
					{ name: coalitonExtracted.name },
					{ $push: { scores: { $each: coalitonExtracted.scores.reverse() } } },
					{ upsert: true }
				);
			} catch (err) {
				console.log(err);
				throw new Error("Update coalition error : ", coalitonExtracted.name);
			}
		});
		console.timeEnd("updateService");
		console.log("End Update");
	} catch (err) {
		console.error(err);
	}
}