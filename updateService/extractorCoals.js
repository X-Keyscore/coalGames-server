import puppeteer from 'puppeteer';
import { setTimeout } from "node:timers/promises";

function dateISO8601ToDate(chaineDate) {
	var part = chaineDate.split(" ");
	var datePart = part[0];
	var heurePart = part[1];
	// Fusionne la date et l'heure en utilisant "T"
	var dateComplete = datePart + "T" + heurePart;
	// Ajoute "Z" à la fin pour indiquer que le décalage horaire est UTC
	dateComplete = dateComplete.replace("+", "Z+");

	var date = new Date(dateComplete);
	return date;
}

async function logIn(page, login, password) {
	try {
		await page.waitForSelector('#username', {timeout: process.env.EXTRACT_TIMEOUT});
		const userInput = await page.$('#username')
		await userInput.focus();
		await userInput.type(login);
		await page.waitForSelector('#password', {timeout: process.env.EXTRACT_TIMEOUT});
		const passInput = await page.$('#password')
		await passInput.focus();
		await passInput.type(password);
		await Promise.all([
			page.click("#kc-login"),
			page.waitForNavigation({ waitUntil: 'load' })
		]);
		await page.reload({ waitUntil: 'load' });
	}
	catch (err) {
		console.error(err);
		throw new Error("Error in logIn");
	}
}

async function switchAllCoalitionsToCoalitionPage(page, id) {
	await page.waitForSelector('.col-sm-3.col-xs-6', {timeout: process.env.EXTRACT_TIMEOUT});
	// L'attribut <a><a/> est bizarre donc je clic sur l'element supérieur
	const accessCoalition = await page.$$('.col-sm-3.col-xs-6');
	await Promise.all([
		await accessCoalition[id].click(),
		page.waitForNavigation({ waitUntil: 'load' })
	]);
}

async function switchCoalitionToAllCoalitionsPage(page) {
	await page.waitForSelector('#coalition-flag-name > a', {timeout: process.env.EXTRACT_TIMEOUT});
	const accessAllCoalition = await page.$('#coalition-flag-name > a');
	if (!accessAllCoalition)
		throw new Error("'accessAllCoalition' is empty");

	await Promise.all([
		await accessAllCoalition.click('a'),
		page.waitForNavigation({ waitUntil: 'load' })
	]);
}

async function switchAllScoresToAllCoalitionsPage(page) {
	await page.waitForSelector('.text-center.font-weight-bold.mb-4.pb-4 > span > a', {timeout: process.env.EXTRACT_TIMEOUT});
	const accessCoalition = await page.$('.text-center.font-weight-bold.mb-4.pb-4 > span > a');
	if (!accessCoalition)
		throw new Error("'accessCoalition' is empty");

	await Promise.all([
		await accessCoalition.click(),
		page.waitForNavigation({ waitUntil: 'load' })
	]);

	await page.waitForSelector('#coalition-flag-name > a', {timeout: process.env.EXTRACT_TIMEOUT});
	const accessAllCoalition = await page.$('#coalition-flag-name > a')
	if (!accessAllCoalition)
		throw new Error("'accessAllCoalition' is empty");
	await Promise.all([
		await accessAllCoalition.click('a'),
		page.waitForNavigation({ waitUntil: 'load' })
	]);
}

async function switchScoresToScoresPage(page) {
	const accessNextPage = await page.$('a[rel="next"]');
	if (!accessNextPage) return false;
	await Promise.all([
		await accessNextPage.click('a'),
		page.waitForNavigation({ waitUntil: 'load' })
	]);
	return true;
}

async function switchCoalitionToAllScoresPage(page) {
	await page.waitForSelector('.text-center > .font-weight-bold', {timeout: process.env.EXTRACT_TIMEOUT});
	const accessAllscore = await page.$('.text-center > .font-weight-bold');
	await Promise.all([
		await accessAllscore.click('a'),
		page.waitForNavigation({ waitUntil: 'load' })
	]);
}

async function extractScores(page, deadline) {

	var pageScores = [];

	const tables = await page.$$('tbody tr');
	for (const element of tables) {
		await setTimeout(1000);
		const date = await element.$$eval('td > span', rows => {
			return Array.from(rows, row => row.getAttribute("data-long-date"));
		});
		const convDate = dateISO8601ToDate(date[0]);
		if (deadline && convDate <= deadline)
			break;

		const rows = await element.$$eval('td', rows => {
			return Array.from(rows, column => column.innerText);
		});

		pageScores.push({
			date: convDate,
			score: Number(rows[3]),
			login: rows[1]
		})
	}
	return pageScores;
}

async function extractionCore(page, deadlines) {
	try {
		var dataCoals = [];
		var id = -1;

		while (id++ < 2) {
			await setTimeout((Math.floor(Math.random() * 12) + 5) * 1000);
			await page.waitForSelector('h4[class="text-center font-weight-bold"]', {timeout: process.env.EXTRACT_TIMEOUT});
			const coalitionsName = await page.$$('h4[class="text-center font-weight-bold"]');
			var nameCoal = await page.evaluate(el => el.textContent, coalitionsName[id]);
			nameCoal = nameCoal.replaceAll("\n", "");
			// Create new Object
			dataCoals.push({
				name: nameCoal,
				scores: [],
				totalNewElements: 0
			})

			// All coalitions -> coalition by id
			await switchAllCoalitionsToCoalitionPage(page, id);

			// Coalition by id -> all scores
			await switchCoalitionToAllScoresPage(page)
			let i = 0;
			extractLoop:
			while (i++ < 5000) {
				var deadlineDate = null;
				var deadline = deadlines.find(deadline => deadline.name === nameCoal)
				if (deadline && deadline.date)
					deadlineDate = deadline.date;
				var extracted = await extractScores(page, deadlineDate);
				// Get new elements
				if (extracted.length === 0)
					break extractLoop;
				dataCoals[id].totalNewElements += extracted.length;
				// Concat array
				Array.prototype.push.apply(dataCoals[id].scores, extracted)
				// scores -> scores
				if (!await switchScoresToScoresPage(page))
					break extractLoop;
			}
			// All scores -> all coalitions
			await switchAllScoresToAllCoalitionsPage(page);
		}
		return dataCoals;
	}
	catch (err) {
		console.error(err);
		throw new Error("failure in core");
	}
}

export default async function extractorCoals(deadlines, login, password) {
	try {
		const browser = await puppeteer.launch({
			args: ['--no-sandbox'],
			headless: true,
			timeout: process.env.EXTRACT_TIMEOUT,
		});
		const page = await browser.newPage();

		page.setDefaultNavigationTimeout(process.env.EXTRACT_TIMEOUT); 
		
		// Improve speed
		await page.setRequestInterception(true);
		page.on('request', (request) => {
			if (['image', 'font'].indexOf(request.resourceType()) !== -1) {
					request.abort();
			} else {
					request.continue();
			}
		});

		await page.goto('https://intra.42.fr/', { waitUntil: 'load' });
		await page.setViewport({ width: 1080, height: 1024 });

		// LogIn intra
		await logIn(page, login, password);
		
		// Home --> coalition of user
		await page.waitForSelector('.coalition-name > a', {timeout: process.env.EXTRACT_TIMEOUT});
		const accessCoalition = await page.$('.coalition-name > a');
		await Promise.all([
			await accessCoalition.click(),
			page.waitForNavigation({ waitUntil: 'load' })
		]);

		// Coalition --> all coalitions
		await switchCoalitionToAllCoalitionsPage(page);

		const extraction = await extractionCore(page, deadlines);

		await browser.close();
		return extraction;
	}
	catch (err) {
		console.error(err);
		throw new Error("failure");
	}
}
//await page.screenshot({ path: 'screenshot.png' });