const router = require("express").Router();
const controller = require("../controllers/appointmentController");

router
  .route("/")
  .get(controller.getAppointments)
  .post(controller.createAppointment);
router.patch("/:id", controller.updateAppointment);

module.exports = router;
