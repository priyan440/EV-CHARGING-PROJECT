import crypto from "crypto";
import Razorpay from "razorpay";
import { query, transaction } from "../config/db.js";

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

let razorpayInstance = null;
try {
  if (keyId && keySecret && !keyId.includes("your_test") && !keyId.includes("YOUR_")) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
} catch (err) {
  console.warn("Razorpay SDK initialization warning:", err.message);
}

/**
 * POST /api/payments/create-order
 * Create Razorpay test order
 */
export const createOrder = async (req, res) => {
  try {
    const {
      amount,
      bookingId,
      totalAmount,
      estimatedKwh = 20,
      pricePerKwh = 18,
      serviceFee = 20,
      discountAmount = 0,
    } = req.body;

    // Calculate or verify total amount in INR
    let serverTotal = 0;
    if (amount || totalAmount) {
      serverTotal = Math.max(1, Math.round(parseFloat(amount || totalAmount)));
    } else {
      const kwh = parseFloat(estimatedKwh);
      const subtotal = kwh * parseFloat(pricePerKwh) + parseFloat(serviceFee) - parseFloat(discountAmount);
      const tax = Math.round(subtotal * 0.18);
      serverTotal = Math.max(1, Math.round(subtotal + tax));
    }

    const timestamp = Date.now().toString().slice(-6);
    const receipt = `RCP_${timestamp}`;

    let razorpayOrder = null;
    if (razorpayInstance) {
      try {
        razorpayOrder = await razorpayInstance.orders.create({
          amount: serverTotal * 100, // paise
          currency: "INR",
          receipt,
          notes: {
            bookingId: bookingId || "PENDING",
            userId: req.user ? String(req.user.id) : "GUEST",
          },
        });
      } catch (err) {
        console.warn("Razorpay API order creation notice:", err.message);
      }
    }

    if (!razorpayOrder) {
      razorpayOrder = {
        id: `order_test_${Date.now()}`,
        amount: serverTotal * 100,
        currency: "INR",
        receipt,
        status: "created",
      };
    }

    res.json({
      success: true,
      keyId,
      orderId: razorpayOrder.id,
      amount: serverTotal * 100,
      currency: "INR",
      order: razorpayOrder,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to create payment order", error: error.message });
  }
};

/**
 * POST /api/payments/verify
 * Verify Razorpay payment and store in MySQL
 */
export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      booking_id,
      bookingId,
      razorpay_order_id,
      razorpayOrderId,
      razorpay_payment_id,
      razorpayPaymentId,
      razorpay_signature,
      razorpaySignature,
      amount,
      payment_method = "Razorpay Standard Checkout",
    } = req.body;

    const rOrderId = razorpay_order_id || razorpayOrderId;
    const rPaymentId = razorpay_payment_id || razorpayPaymentId;
    const rSignature = razorpay_signature || razorpaySignature;
    const cleanAmount = parseFloat(amount) || 416.0;

    // Validate presence of required verification parameters
    if (!rSignature || !rOrderId || !rPaymentId) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification parameters (order_id, payment_id, or signature).",
      });
    }

    const activeSecret = process.env.RAZORPAY_KEY_SECRET || keySecret;

    if (!activeSecret) {
      return res.status(500).json({
        success: false,
        message: "Server payment configuration error (RAZORPAY_KEY_SECRET is not configured).",
      });
    }

    // Cryptographic verification of Razorpay HMAC SHA256 signature
    const generatedSignature = crypto
      .createHmac("sha256", activeSecret)
      .update(`${rOrderId}|${rPaymentId}`)
      .digest("hex");

    let isSignatureValid = false;
    try {
      const sigBuf = Buffer.from(rSignature, "utf8");
      const genBuf = Buffer.from(generatedSignature, "utf8");
      isSignatureValid = sigBuf.length === genBuf.length && crypto.timingSafeEqual(sigBuf, genBuf);
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid cryptographic signature.",
      });
    }

    // Resolve Booking in MySQL
    const bId = booking_id || bookingId;
    let numericBookingId = null;

    if (bId) {
      const isNumeric = /^\d+$/.test(bId);
      const bookings = await query(
        "SELECT id, booking_id FROM bookings WHERE booking_id = ? OR id = ?",
        [bId, isNumeric ? parseInt(bId, 10) : 0]
      );
      if (bookings && bookings.length > 0) {
        numericBookingId = bookings[0].id;
      }
    }

    if (!numericBookingId) {
      // Find latest booking for this user
      const latest = await query(
        "SELECT id FROM bookings WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [userId]
      );
      if (latest && latest.length > 0) {
        numericBookingId = latest[0].id;
      }
    }

    if (!numericBookingId) {
      return res.status(400).json({ success: false, message: "Associated booking not found for payment." });
    }

    // Insert payment record & update booking in MySQL
    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO payments 
         (booking_id, user_id, amount, payment_method, transaction_id, razorpay_order_id, razorpay_payment_id, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS')`,
        [numericBookingId, userId, cleanAmount, payment_method, rPaymentId, rOrderId, rPaymentId]
      );

      await connection.execute(
        "UPDATE bookings SET status = 'CONFIRMED' WHERE id = ?",
        [numericBookingId]
      );
    });

    res.json({
      success: true,
      message: "Payment verified successfully!",
      payment: {
        bookingId: bId,
        paymentId: rPaymentId,
        amount: cleanAmount,
        status: "SUCCESS",
      },
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ success: false, message: "Payment verification failed", error: error.message });
  }
};

/**
 * GET /api/payments
 * Get all payment records from MySQL
 */
export const getPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let sql = `
      SELECT p.*, b.booking_id as booking_code, u.name as customer_name, u.email as customer_email,
             s.station_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON p.user_id = u.id
      JOIN charging_stations s ON b.station_id = s.id
    `;
    let params = [];

    if (role === "USER") {
      sql += " WHERE p.user_id = ?";
      params.push(userId);
    } else if (role === "STATION_OWNER") {
      sql += " WHERE s.owner_id = ?";
      params.push(userId);
    }

    sql += " ORDER BY p.id DESC";

    const rows = await query(sql, params);

    const formatted = rows.map((p) => ({
      id: p.id,
      paymentId: `PAY${String(p.id).padStart(6, "0")}`,
      bookingId: p.booking_code || `BK${p.booking_id}`,
      userId: p.user_id,
      counterId: `CUS${String(p.user_id).padStart(4, "0")}`,
      customerName: p.customer_name,
      stationName: p.station_name,
      amount: parseFloat(p.amount),
      paymentMethod: p.payment_method,
      transactionId: p.transaction_id,
      razorpayOrderId: p.razorpay_order_id,
      razorpayPaymentId: p.razorpay_payment_id,
      status: p.payment_status === "SUCCESS" ? "CAPTURED" : p.payment_status,
      rawStatus: p.payment_status,
      date: p.created_at,
      createdAt: p.created_at,
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching payments", error: error.message });
  }
};

/**
 * POST /api/payments/refund
 * Issue refund for cancelled booking
 */
export const requestRefund = async (req, res) => {
  try {
    const { bookingId, reason = "Customer Cancellation" } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Booking ID is required for refund." });
    }

    const bookings = await query(
      "SELECT id, amount, status FROM bookings WHERE booking_id = ? OR id = ?",
      [bookingId, /^\d+$/.test(bookingId) ? parseInt(bookingId, 10) : 0]
    );

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = bookings[0];

    // Update payment record to REFUNDED
    await query(
      "UPDATE payments SET payment_status = 'REFUNDED' WHERE booking_id = ?",
      [booking.id]
    );

    await query(
      "UPDATE bookings SET status = 'CANCELLED' WHERE id = ?",
      [booking.id]
    );

    const refundId = `RFD${Date.now().toString().slice(-6)}`;

    res.json({
      success: true,
      message: `Refund of ₹${booking.amount} processed successfully.`,
      refundId,
      bookingId,
      amount: parseFloat(booking.amount),
      reason,
      status: "REFUNDED",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error processing refund", error: error.message });
  }
};

export default {
  createOrder,
  verifyPayment,
  getPayments,
  requestRefund,
};
