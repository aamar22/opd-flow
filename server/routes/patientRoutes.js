const router = require("express").Router();
const controller = require("../controllers/patientController");
router.route("/").get(controller.getPatients).post(controller.createPatient);
module.exports = router;
