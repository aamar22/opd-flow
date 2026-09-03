const router = require("express").Router();
const controller = require("../controllers/medicineController");
router.route("/").get(controller.getMedicines).post(controller.createMedicine);
router.post("/dispense", controller.dispenseMedicines);
router.patch("/:id", controller.updateMedicine);
module.exports = router;
