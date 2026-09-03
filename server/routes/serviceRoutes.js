const router = require("express").Router();
const controller = require("../controllers/serviceController");
router.route("/").get(controller.getServices).post(controller.createService);
router.patch("/:id", controller.updateService);
module.exports = router;
