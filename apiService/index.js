import 'dotenv/config'
import express from 'express';
const app = express();
import cors from 'cors';
import http from 'node:http';
import Cache from './middleware/Cache.js';
import db from '../mongooseService/index.js';
import coalitionsRouter from './routes/coalitions-router.js'

const { URL_AUDIENCE, API_PORT } = process.env;

app.use(cors({
	origin: URL_AUDIENCE,
	optionsSuccessStatus: 200 // For legacy browser support
}))

app.use(Cache);

const server = http.createServer(app);

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use('/api/', coalitionsRouter);

server.listen(API_PORT, () => console.log(`Server running on port ${API_PORT}`));