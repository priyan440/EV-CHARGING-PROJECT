import { query, transaction } from "../config/db.js";
import { getIO } from "../services/socketService.js";

/**
 * GET /api/wallet
 * Fetch user's live wallet balance and transaction ledger from MySQL
 */
export const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user's current wallet balance
    const userRows = await query(
      "SELECT wallet_balance FROM users WHERE id = ?",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const balance = parseFloat(userRows[0].wallet_balance) || 0.0;

    // 2. Fetch user's wallet transactions
    const txRows = await query(
      `SELECT 
         transaction_id as id,
         transaction_id,
         type,
         amount,
         balance_after,
         description,
         booking_id,
         created_at as date
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        balance,
        transactions: txRows.map((t) => ({
          id: t.transaction_id || `TXN_${t.id}`,
          type: t.type,
          amount: parseFloat(t.amount) || 0,
          balanceAfter: parseFloat(t.balance_after) || 0,
          description: t.description || (t.type === "CREDIT" ? "Wallet Top-Up" : "Charging Payment"),
          date: t.date,
          bookingId: t.booking_id,
        })),
      },
    });
  } catch (error) {
    console.error("getWallet error:", error);
    res.status(500).json({ success: false, message: "Failed to load wallet", error: error.message });
  }
};

/**
 * POST /api/wallet/topup
 * Add funds to user's wallet balance in MySQL
 */
export const topUpWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, description = "Wallet Top-Up via Razorpay Test Mode" } = req.body;
    const topUpAmt = parseFloat(amount);

    if (isNaN(topUpAmt) || topUpAmt <= 0) {
      return res.status(400).json({ success: false, message: "Invalid top-up amount" });
    }

    const txId = `TXN_W_${Date.now()}`;
    let newBalance = 0;

    await transaction(async (conn) => {
      // 1. Lock and update user wallet balance
      await conn.execute(
        "UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?",
        [topUpAmt, userId]
      );

      // 2. Fetch updated balance
      const [uRows] = await conn.execute(
        "SELECT wallet_balance FROM users WHERE id = ?",
        [userId]
      );
      newBalance = parseFloat(uRows[0]?.wallet_balance) || 0;

      // 3. Record in wallet_transactions
      await conn.execute(
        `INSERT INTO wallet_transactions 
         (transaction_id, user_id, type, amount, balance_after, description)
         VALUES (?, ?, 'CREDIT', ?, ?, ?)`,
        [txId, userId, topUpAmt, newBalance, description]
      );

      // 4. Create notification
      const notifId = `NOT${Date.now().toString().slice(-6)}`;
      await conn.execute(
        `INSERT INTO notifications (notification_id, user_id, type, title, message, reference_type, reference_id)
         VALUES (?, ?, 'PAYMENT_SUCCESS', 'Wallet Credited', ?, 'WALLET', ?)`,
        [notifId, userId, `Successfully credited ₹${topUpAmt.toFixed(2)} to your EV wallet. New balance: ₹${newBalance.toFixed(2)}`, txId]
      );
    });

    res.json({
      success: true,
      message: `Successfully topped up ₹${topUpAmt.toFixed(2)}`,
      data: {
        balance: newBalance,
        transaction: {
          id: txId,
          type: "CREDIT",
          amount: topUpAmt,
          balanceAfter: newBalance,
          description,
          date: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("topUpWallet error:", error);
    res.status(500).json({ success: false, message: "Failed to top up wallet", error: error.message });
  }
};

/**
 * POST /api/wallet/pay
 * Atomically deduct amount from user's wallet in MySQL, record in payments table,
 * and link to booking so that Station Owner Revenue & Ledger updates immediately!
 */
export const payWithWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId, booking_id, amount, stationId, station_id } = req.body;
    const payAmt = parseFloat(amount);

    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment amount" });
    }

    const bId = bookingId || booking_id;
    let numericBookingId = null;
    let resolvedStationId = stationId || station_id || null;

    if (bId) {
      const isNumeric = /^\d+$/.test(bId);
      const bookings = await query(
        "SELECT id, booking_id, station_id, charger_id FROM bookings WHERE booking_id = ? OR id = ?",
        [bId, isNumeric ? parseInt(bId, 10) : 0]
      );
      if (bookings && bookings.length > 0) {
        numericBookingId = bookings[0].id;
        if (!resolvedStationId) {
          resolvedStationId = bookings[0].station_id;
        }
      }
    }

    const payCounterId = `PAY_W_${Date.now().toString().slice(-6)}`;
    const txId = `TXN_W_${Date.now()}`;
    let remainingBalance = 0;

    // Atomic MySQL Transaction: Debit Wallet + Insert Payment + Update Booking
    await transaction(async (conn) => {
      // 1. Lock user row and check balance
      const [uRows] = await conn.execute(
        "SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );

      if (!uRows || uRows.length === 0) {
        throw new Error("User record not found");
      }

      const currentBal = parseFloat(uRows[0].wallet_balance) || 0;
      if (currentBal < payAmt) {
        throw new Error(`Insufficient wallet balance (₹${currentBal.toFixed(2)}). Required: ₹${payAmt.toFixed(2)}`);
      }

      remainingBalance = currentBal - payAmt;

      // 2. Deduct from users table
      await conn.execute(
        "UPDATE users SET wallet_balance = ? WHERE id = ?",
        [remainingBalance, userId]
      );

      // 3. Record in wallet_transactions (DEBIT)
      await conn.execute(
        `INSERT INTO wallet_transactions 
         (transaction_id, user_id, type, amount, balance_after, description, booking_id)
         VALUES (?, ?, 'DEBIT', ?, ?, ?, ?)`,
        [txId, userId, payAmt, remainingBalance, `Payment for EV Booking ${bId || payCounterId}`, numericBookingId]
      );

      // 4. Insert into payments table (with payment_method = 'WALLET', gateway = 'WALLET')
      await conn.execute(
        `INSERT INTO payments 
         (payment_id, booking_id, user_id, gateway, gateway_order_id, gateway_payment_id, gateway_signature, amount, currency, payment_method, payment_status, paid_at)
         VALUES (?, ?, ?, 'WALLET', ?, ?, 'WALLET_AUTH_VERIFIED', ?, 'INR', 'WALLET', 'SUCCESS', NOW())`,
        [payCounterId, numericBookingId, userId, `WALLET_ORD_${Date.now()}`, payCounterId, payAmt]
      );

      // 5. Update Booking & Charger Status if booking exists
      if (numericBookingId) {
        await conn.execute(
          `UPDATE bookings 
           SET booking_status = 'CONFIRMED', payment_status = 'PAID', payment_id = ?, updated_at = NOW() 
           WHERE id = ?`,
          [payCounterId, numericBookingId]
        );

        await conn.execute(
          `UPDATE chargers c 
           JOIN bookings b ON b.charger_id = c.id 
           SET c.status = 'RESERVED' 
           WHERE b.id = ?`,
          [numericBookingId]
        );
      }

      // 6. Record Notification
      const payNotifId = `NOT${Date.now().toString().slice(-6)}`;
      await conn.execute(
        `INSERT INTO notifications (notification_id, user_id, type, title, message, reference_type, reference_id)
         VALUES (?, ?, 'PAYMENT_SUCCESS', 'Wallet Payment Confirmed', ?, 'PAYMENT', ?)`,
        [payNotifId, userId, `Paid ₹${payAmt.toFixed(2)} via EV Customer Wallet for booking ${bId || payCounterId}.`, payCounterId]
      );

      // 7. Record Audit Log
      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
         VALUES (?, 'PAYMENT_WALLET_SUCCESS', 'PAYMENT', ?, ?)`,
        [userId, payCounterId, `Wallet payment of INR ${payAmt} verified for booking ${bId || payCounterId}`]
      );
    });

    // 8. Real-time broadcast to Station Owner and Admin
    try {
      const io = getIO();
      if (io) {
        io.emit("PAYMENT_RECEIVED", {
          paymentId: payCounterId,
          bookingId: bId,
          amount: payAmt,
          paymentMethod: "WALLET",
          status: "SUCCESS",
          stationId: resolvedStationId,
          timestamp: new Date().toISOString(),
        });
        io.emit("BOOKING_UPDATED", {
          bookingId: bId,
          paymentStatus: "PAID",
          paymentMethod: "WALLET",
          status: "CONFIRMED",
        });
        io.emit("DASHBOARD_UPDATE", { type: "REVENUE_UPDATED", stationId: resolvedStationId });
      }
    } catch (sockErr) {
      console.warn("Socket broadcast error on wallet payment:", sockErr.message);
    }

    res.json({
      success: true,
      message: `Successfully paid ₹${payAmt.toFixed(2)} via EV Wallet`,
      data: {
        paymentId: payCounterId,
        payment_id: payCounterId,
        bookingId: bId,
        amount: payAmt,
        remainingBalance,
        paymentMethod: "WALLET",
        gateway: "WALLET",
        status: "SUCCESS",
        date: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("payWithWallet error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to process wallet payment" });
  }
};
