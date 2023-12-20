import mongoose from 'mongoose';
import Coalitions from '../../models/coalitions-model.js';
import RespHandler from '../class/RespHandler.js';

// Fonction pour obtenir le numéro de semaine à partir d'une date
function getWeekNumber(date) {
	const onejan = new Date(date.getFullYear(), 0, 1);
	const millisecondsInDay = 86400000;
	return Math.ceil(((date - onejan) / millisecondsInDay + onejan.getDay() + 1) / 7);
}

function calculateOverallScore(allScores) {
	var totalScore = 0;
	for (var score of allScores)
		totalScore += score.score;
	return totalScore;
}

function generateWeeklyStats(coalitions) {
	const weeklyScores = {};

	// Parcourir chaque coalition
	coalitions.forEach(coalition => {
		const coalitionName = coalition.name;

		coalition.scores.forEach(score => {
			const weekNumber = getWeekNumber(new Date(score.date));
			const scoreValue = parseInt(score.score);

			if (!weeklyScores[weekNumber]) {
				weeklyScores[weekNumber] = {};
			}
			if (!weeklyScores[weekNumber][coalitionName]) {
				weeklyScores[weekNumber][coalitionName] = { totalScore: 0 };
			}
			weeklyScores[weekNumber][coalitionName].totalScore += scoreValue;
		});
	});

	const weeklyStats = {};
	Object.keys(weeklyScores).forEach(weekNumber => {
		weeklyStats[weekNumber] = {};

		const sortedCoalitions = Object.keys(weeklyScores[weekNumber]).sort((a, b) => {
			const scoreA = weeklyScores[weekNumber][a].totalScore;
			const scoreB = weeklyScores[weekNumber][b].totalScore;
			return scoreB - scoreA;
		});

		sortedCoalitions.forEach((coalition, index) => {
			if (index === 0) {
				weeklyStats[weekNumber][coalition] = { win: true, totalScore: weeklyScores[weekNumber][coalition].totalScore };
			} else {
				weeklyStats[weekNumber][coalition] = { win: false, totalScore: weeklyScores[weekNumber][coalition].totalScore };
			}
		});
	});

	return weeklyStats;
}

// Trie les coalitions en fonction du score de la semaine actuelle et ajoute currentRanking
function addRanking(coalitions, currentWeekStats) {
	if (!currentWeekStats) return;
	const sortedCoalitions = coalitions.sort((a, b) => {
		const scoreA = currentWeekStats[a.name].totalScore || 0;
		const scoreB = currentWeekStats[b.name].totalScore || 0;
		return scoreB - scoreA;
	});
	sortedCoalitions.forEach((coalition, index) => {
		const currentScore = currentWeekStats[coalition.name].totalScore || 0;
		coalition.currentScore = currentScore;
		coalition.currentRanking = index + 1;
	});
	return sortedCoalitions;
}
async function getCoalitions(req, res) {
	const Resp = new RespHandler(res);
	try {
		var coalitions = await Coalitions.find({})
			.then((coalitions) => { return coalitions; })
			.catch((err) => {
				console.error(err);
				throw Resp.params(500, "Server error");
			})
		const weeklyStats = generateWeeklyStats(coalitions);
		coalitions.forEach(
			(coalition, index, This) => {
				var coalitionObj = coalition.toObject();
				const overallScore = calculateOverallScore(coalitionObj.scores);

				var coalitionObjReturn = {
					name: coalitionObj.name,
					updatedAt: coalitionObj.updatedAt,
					overallScore: overallScore,
				}
				This[index] = coalitionObjReturn;
			});

		//Trie la liste en fonction du meilleur score de la semaine (pour la partie client c'est plus simple)
		coalitions = addRanking(coalitions, weeklyStats[getWeekNumber(new Date)]);


		Resp.params(201, "OK", {
			coalitions: coalitions,
			weeklyStats,
			currentWeek: getWeekNumber(new Date)
		}).send();
	} catch (err) {
		if (err instanceof RespHandler) err.send();
		else {
			console.log(err);
			Resp.params(500, "Error").send();
		}
	}
}

export { getCoalitions };
