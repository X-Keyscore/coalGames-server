import { CronJob } from 'cron';
import startUpdate from './updateService/index.js'
import startApi from './apiService/index.js';

const job = new CronJob('0 */30 * * * *', function () {
	const d = new Date();
	console.log("Start Update :", d);
	startUpdate();
});
job.start();

startApi();