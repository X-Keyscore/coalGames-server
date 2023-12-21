import 'dotenv/config'
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import http from 'node:http';
import Cache from './middleware/Cache.js';
import db from '../mongooseService/index.js';
import coalitionsRouter from './routes/coalitions-router.js'
const app = express();

const { URL_AUDIENCE, API_PORT } = process.env;

export default function startApi() {
	app.use(helmet());

	/*
	const origin = cors({
		origin: URL_AUDIENCE,
		optionsSuccessStatus: 200 // For legacy browser support
	})
	app.use(origin)*/
	app.use(cors());
	res.setHeader('Access-Control-Allow-Origin', '*');

	const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite chaque IP à 100 requêtes par windowMs
	});
	app.use("/api/", limiter);
	
	app.use(Cache);
	
	const server = http.createServer(app);
	
	db.on('error', console.error.bind(console, 'MongoDB connection error:'));
	
	app.use('/api/', coalitionsRouter);
	
	server.listen(API_PORT, () => console.log(`Server running on port ${API_PORT}`));
}
