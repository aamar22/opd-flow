const router = require("express").Router();
const controller = require("../controllers/clinicSettingsController");
router.route("/").get(controller.getSettings).put(controller.updateSettings);
router.get("/availability", controller.getAvailability);
module.exports = router;
