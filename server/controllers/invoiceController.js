const Invoice = require("../models/Invoice");
const { list, create } = require("../data/memoryStore");
const { readPagination, paginatedResponse } = require("../utils/pagination");
const invoiceNumber = () => `INV-${Date.now().toString().slice(-8)}`;
exports.getInvoices = async (req, res, next) => {
  try {
    const { page, limit, skip } = readPagination(req.query);
    const term = req.query.search?.toLowerCase();
    const invoices = await list(Invoice, "invoices");
    const matches = invoices.filter(
      (item) =>
        (!req.query.invoiceType ||
          item.invoiceType === req.query.invoiceType) &&
        (!term ||
          [item.patientName, item.patientId, item.invoiceNumber].some((value) =>
            value?.toLowerCase().includes(term),
          )),
    );
    paginatedResponse(res, {
      items: matches.slice(skip, skip + limit),
      totalItems: matches.length,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
};
exports.createInvoice = async (req, res, next) => {
  try {
    const items = (req.body.items || []).map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 1,
      amount: Number(item.rate) * (Number(item.quantity) || 1),
    }));
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = Number(req.body.discount) || 0;
    const invoice = await create(Invoice, "invoices", {
      invoiceType: "Service",
      status: "Paid",
      paymentMode: "Cash",
      ...req.body,
      invoiceNumber: invoiceNumber(),
      items,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
    });
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};
