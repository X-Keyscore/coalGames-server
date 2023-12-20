import express from 'express'
import { getCoalitions } from '../controllers/coalitions-ctrl.js'

const router = express.Router()

router.get('/coalitions', getCoalitions)

export default router;