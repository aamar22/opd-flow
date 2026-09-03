const router = require("express").Router();
const controller = require("../controllers/visitController");
router.route("/").get(controller.getVisits).post(controller.createVisit);
router.patch("/:id", controller.updateVisit);
module.exports = router;
