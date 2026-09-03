const router = require("express").Router();
const {
  getDashboard,
  getRevenue,
} = require("../controllers/dashboardController");
router.get("/", getDashboard);
router.get("/revenue", getRevenue);
module.exports = router;
