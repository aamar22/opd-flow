const router = require("express").Router();
const controller = require("../controllers/ipdController");

router.route("/wards").get(controller.getWards).post(controller.createWard);
router
  .route("/wards/:id")
  .patch(controller.updateWard)
  .delete(controller.deleteWard);
router.post("/wards/:id/beds", controller.addBed);
router.patch("/wards/:id/beds/:bedId/status", controller.updateBedStatus);
router
  .route("/wards/:id/beds/:bedId")
  .patch(controller.updateBed)
  .delete(controller.deleteBed);
router
  .route("/admissions")
  .get(controller.getAdmissions)
  .post(controller.createAdmission);
router.patch("/admissions/:id/discharge", controller.dischargeAdmission);
router.patch("/admissions/:id/transfer", controller.transferAdmission);
router.post("/admissions/:id/doctor-charges", controller.addDoctorCharge);
router.post("/admissions/:id/advances", controller.addAdvancePayment);
router.get("/admissions/:id/bill-preview", controller.getBillPreview);
router.post("/admissions/:id/bill", controller.createIpdBill);
router
  .route("/billing-rules")
  .get(controller.getBillingRules)
  .put(controller.updateBillingRules);

module.exports = router;
