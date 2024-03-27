// routes/dataRoutes.js

const express = require('express');
const router = express.Router();
const dataController = require('../controller/dataController.js');

router.get("/", dataController.helloWorld);
router.get("/startData", dataController.getStartData);
router.get("/latestData", dataController.getLatestData);
router.get("/initialBuffer", dataController.getInitialBuffer);

module.exports = router;