const router = require("express").Router();
const controller = require("../controllers/clinicSettingsController");
router.route("/").get(controller.getSettings).put(controller.updateSettings);
router.get("/availability", controller.getAvailability);
router.put("/modules", controller.updateModules);
module.exports = router;
