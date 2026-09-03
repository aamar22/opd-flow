const router = require("express").Router();
const controller = require("../controllers/invoiceController");
router.route("/").get(controller.getInvoices).post(controller.createInvoice);
module.exports = router;
