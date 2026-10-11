import { query } from "../config/db.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

// Helper: Check if authenticated user is ADMIN
const isAdmin = (req) => {
  return (req.user?.role || "").toUpperCase() === "ADMIN";
};

// Helper: Extract owner user ID from request
const getOwnerId = (req) => {
  return req.user?.id || 0;
};

// Helper: Generate next sequential Expense ID (e.g., EXP000001)
const getNextExpenseId = async () => {
  try {
    const rows = await query("SELECT expense_id FROM station_expenses ORDER BY id DESC LIMIT 1");
    let nextNum = 1;
    if (rows && rows.length > 0 && rows[0].expense_id) {
      const match = String(rows[0].expense_id).match(/^EXP(\d+)/i);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `EXP${String(nextNum).padStart(6, "0")}`;
  } catch {
    return `EXP${Date.now().toString().slice(-6)}`;
  }
};

// Helper: Retrieve all station IDs owned by authenticated owner
const getOwnerStationIds = async (req, requestedStationId = null) => {
  let sql = "SELECT id FROM stations WHERE 1=1";
  const params = [];

  if (!isAdmin(req)) {
    sql += " AND owner_id = ?";
    params.push(getOwnerId(req));
  }

  if (requestedStationId && requestedStationId !== "ALL") {
    sql += " AND id = ?";
    params.push(parseInt(requestedStationId, 10));
  }

  const rows = await query(sql, params);
  return rows.map((r) => r.id);
};

/**
 * 1. GET /api/owner/profitability/summary
 * Aggregates Gross Charging Revenue, Net Collections, Electricity Costs,
 * Payment Processing Fees, Maintenance, Operating Expenses, Operating Profit, and Margins.
 */
export const getOwnerProfitabilitySummary = async (req, res) => {
  try {
    const { stationId, startDate, endDate, period } = req.query;
    const stationIds = await getOwnerStationIds(req, stationId);

    if (stationIds.length === 0) {
      return res.json({
        success: true,
        summary: {
          grossRevenue: 0,
          refunds: 0,
          netCollections: 0,
          electricityCosts: 0,
          paymentFees: 0,
          maintenanceExpenses: 0,
          otherExpenses: 0,
          totalExpenses: 0,
          operatingProfit: 0,
          profitMargin: 0,
          totalKwhDelivered: 0,
          totalSessions: 0,
          totalBookings: 0,
          revenuePerKwh: 0,
          energyCostPerKwh: 0,
          isElectricityCostEstimated: false,
          isPaymentFeeEstimated: false,
          incompleteDataWarning: "No stations registered under this account.",
          stationsCount: 0,
        },
      });
    }

    // Date clause builder
    let dateFilterSql = "";
    const dateParams = [];

    if (startDate && endDate) {
      dateFilterSql = " AND (DATE(created_at) BETWEEN ? AND ?)";
      dateParams.push(startDate, endDate);
    } else if (period === "today") {
      dateFilterSql = " AND (DATE(created_at) = CURRENT_DATE())";
    } else if (period === "week") {
      dateFilterSql = " AND (created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))";
    } else if (period === "month") {
      dateFilterSql = " AND (created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))";
    } else if (period === "year") {
      dateFilterSql = " AND (created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR))";
    }

    const stPlaceholders = stationIds.map(() => "?").join(",");

    // 1. Gross Revenue & Collections from verified payments and completed bookings
    // Avoid double counting by prioritizing verified payments, joined with booking station
    const paymentSql = `
      SELECT 
        COALESCE(SUM(p.amount), 0) as total_payments,
        COALESCE(SUM(p.refund_amount), 0) as total_refunds
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE b.station_id IN (${stPlaceholders})
        AND p.payment_status IN ('SUCCESS', 'PAID', 'REFUNDED')
        ${dateFilterSql.replace(/created_at/g, "p.created_at")}
    `;
    const paymentRows = await query(paymentSql, [...stationIds, ...dateParams]);
    let grossPayments = parseFloat(paymentRows[0]?.total_payments || 0);
    let totalRefunds = parseFloat(paymentRows[0]?.total_refunds || 0);

    // Fallback: If no gateway payment rows yet, aggregate directly from paid bookings
    if (grossPayments === 0) {
      const bookingSql = `
        SELECT COALESCE(SUM(estimated_amount), 0) as booking_rev, COUNT(*) as b_cnt
        FROM bookings
        WHERE station_id IN (${stPlaceholders})
          AND payment_status IN ('PAID', 'SUCCESS')
          AND booking_status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
          ${dateFilterSql}
      `;
      const bookingRows = await query(bookingSql, [...stationIds, ...dateParams]);
      grossPayments = parseFloat(bookingRows[0]?.booking_rev || 0);
    }

    const netCollections = Math.max(0, grossPayments - totalRefunds);

    // 2. Charging Sessions & Energy Delivered
    const sessionSql = `
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(energy_kwh), 0) as total_kwh,
        COALESCE(SUM(total_amount), 0) as session_rev
      FROM charging_sessions
      WHERE station_id IN (${stPlaceholders})
        AND session_status IN ('COMPLETED', 'ACTIVE', 'CHARGING', 'IN_PROGRESS')
        ${dateFilterSql}
    `;
    const sessionRows = await query(sessionSql, [...stationIds, ...dateParams]);
    const totalSessions = parseInt(sessionRows[0]?.total_sessions || 0, 10);
    const totalKwhDelivered = parseFloat(sessionRows[0]?.total_kwh || 0);

    // 3. Recorded Expenses from `station_expenses`
    const expenseDateSql = dateFilterSql.replace(/created_at/g, "expense_date");
    const expenseSql = `
      SELECT 
        category,
        COALESCE(SUM(amount), 0) as total_amount
      FROM station_expenses
      WHERE station_id IN (${stPlaceholders})
        ${expenseDateSql}
      GROUP BY category
    `;
    const expenseRows = await query(expenseSql, [...stationIds, ...dateParams]);

    const recordedExpenses = {};
    expenseRows.forEach((r) => {
      recordedExpenses[r.category] = parseFloat(r.total_amount || 0);
    });

    let electricityCosts = recordedExpenses["ELECTRICITY"] || 0;
    let isElectricityCostEstimated = false;

    // If electricity cost is not manually booked in expenses, calculate dynamically from station tariff / config
    if (electricityCosts === 0 && totalKwhDelivered > 0) {
      // Fetch average grid cost per kWh for these stations
      const gridCostRows = await query(
        `SELECT AVG(grid_cost_per_kwh) as avg_grid_cost FROM station_energy_configs WHERE station_id IN (${stPlaceholders})`,
        stationIds
      );
      const avgGridRate = parseFloat(gridCostRows[0]?.avg_grid_cost || 8.5);
      electricityCosts = parseFloat((totalKwhDelivered * avgGridRate).toFixed(2));
      isElectricityCostEstimated = true;
    }

    let paymentFees = recordedExpenses["PAYMENT_FEE"] || 0;
    let isPaymentFeeEstimated = false;
    // Standard Payment Processing fee (2% of net collections) if not booked
    if (paymentFees === 0 && netCollections > 0) {
      paymentFees = parseFloat((netCollections * 0.02).toFixed(2));
      isPaymentFeeEstimated = true;
    }

    const maintenanceExpenses = recordedExpenses["MAINTENANCE"] || 0;
    const otherExpenses =
      (recordedExpenses["RENT_LEASE"] || 0) +
      (recordedExpenses["INSURANCE"] || 0) +
      (recordedExpenses["INTERNET_TELECOM"] || 0) +
      (recordedExpenses["EQUIPMENT"] || 0) +
      (recordedExpenses["OTHER"] || 0);

    const totalExpenses = parseFloat(
      (electricityCosts + paymentFees + maintenanceExpenses + otherExpenses).toFixed(2)
    );

    const operatingProfit = parseFloat((netCollections - totalExpenses).toFixed(2));
    const profitMargin =
      grossPayments > 0 ? parseFloat(((operatingProfit / grossPayments) * 100).toFixed(1)) : 0;

    const revenuePerKwh =
      totalKwhDelivered > 0 ? parseFloat((grossPayments / totalKwhDelivered).toFixed(2)) : 0;
    const energyCostPerKwh =
      totalKwhDelivered > 0 ? parseFloat((electricityCosts / totalKwhDelivered).toFixed(2)) : 0;

    let incompleteDataWarning = null;
    if (isElectricityCostEstimated) {
      incompleteDataWarning =
        "Electricity costs are estimated based on station grid rate (₹8.50/kWh). Add utility bill records under Station Expenses for exact reconciliation.";
    }

    res.json({
      success: true,
      summary: {
        grossRevenue: grossPayments,
        refunds: totalRefunds,
        netCollections,
        electricityCosts,
        paymentFees,
        maintenanceExpenses,
        otherExpenses,
        totalExpenses,
        operatingProfit,
        profitMargin,
        totalKwhDelivered,
        totalSessions,
        revenuePerKwh,
        energyCostPerKwh,
        isElectricityCostEstimated,
        isPaymentFeeEstimated,
        incompleteDataWarning,
        stationsCount: stationIds.length,
      },
    });
  } catch (err) {
    console.error("getOwnerProfitabilitySummary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. GET /api/owner/profitability/stations
 * Provides comparative breakdown between stations owned by the authenticated owner.
 */
export const getOwnerProfitabilityStations = async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;
    const stationIds = await getOwnerStationIds(req);

    if (stationIds.length === 0) {
      return res.json({ success: true, stations: [] });
    }

    const stPlaceholders = stationIds.map(() => "?").join(",");

    let dateFilterSql = "";
    const dateParams = [];
    if (startDate && endDate) {
      dateFilterSql = " AND (DATE(created_at) BETWEEN ? AND ?)";
      dateParams.push(startDate, endDate);
    } else if (period === "today") {
      dateFilterSql = " AND (DATE(created_at) = CURRENT_DATE())";
    } else if (period === "week") {
      dateFilterSql = " AND (created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))";
    } else if (period === "month") {
      dateFilterSql = " AND (created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))";
    }

    // Fetch station metadata
    const stationDetails = await query(
      `SELECT s.id, s.station_id, s.station_name, s.city, s.status, s.approval_status,
              sec.grid_cost_per_kwh,
              (SELECT COUNT(*) FROM chargers WHERE station_id = s.id) as charger_count
       FROM stations s
       LEFT JOIN station_energy_configs sec ON s.id = sec.station_id
       WHERE s.id IN (${stPlaceholders})`,
      stationIds
    );

    const results = [];

    for (const st of stationDetails) {
      // Payments / revenue
      const pRows = await query(
        `SELECT COALESCE(SUM(p.amount), 0) as rev, COALESCE(SUM(p.refund_amount), 0) as ref
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         WHERE b.station_id = ? AND p.payment_status IN ('SUCCESS', 'PAID', 'REFUNDED')
         ${dateFilterSql.replace(/created_at/g, "p.created_at")}`,
        [st.id, ...dateParams]
      );
      let rev = parseFloat(pRows[0]?.rev || 0);
      let ref = parseFloat(pRows[0]?.ref || 0);

      if (rev === 0) {
        const bRows = await query(
          `SELECT COALESCE(SUM(estimated_amount), 0) as rev
           FROM bookings
           WHERE station_id = ? AND payment_status IN ('PAID', 'SUCCESS')
           ${dateFilterSql}`,
          [st.id, ...dateParams]
        );
        rev = parseFloat(bRows[0]?.rev || 0);
      }

      const netRev = Math.max(0, rev - ref);

      // Energy & Sessions
      const sRows = await query(
        `SELECT COALESCE(SUM(energy_kwh), 0) as kwh, COUNT(*) as sessions
         FROM charging_sessions
         WHERE station_id = ? AND session_status IN ('COMPLETED', 'ACTIVE', 'CHARGING', 'IN_PROGRESS')
         ${dateFilterSql}`,
        [st.id, ...dateParams]
      );
      const kwh = parseFloat(sRows[0]?.kwh || 0);
      const sessions = parseInt(sRows[0]?.sessions || 0, 10);

      // Expenses
      const expRows = await query(
        `SELECT category, COALESCE(SUM(amount), 0) as total
         FROM station_expenses
         WHERE station_id = ? ${dateFilterSql.replace(/created_at/g, "expense_date")}
         GROUP BY category`,
        [st.id, ...dateParams]
      );

      const expMap = {};
      expRows.forEach((r) => {
        expMap[r.category] = parseFloat(r.total || 0);
      });

      const gridRate = parseFloat(st.grid_cost_per_kwh || 8.5);
      const electricity = expMap["ELECTRICITY"] || parseFloat((kwh * gridRate).toFixed(2));
      const paymentFee = expMap["PAYMENT_FEE"] || parseFloat((netRev * 0.02).toFixed(2));
      const maintenance = expMap["MAINTENANCE"] || 0;
      const other =
        (expMap["RENT_LEASE"] || 0) +
        (expMap["INSURANCE"] || 0) +
        (expMap["INTERNET_TELECOM"] || 0) +
        (expMap["EQUIPMENT"] || 0) +
        (expMap["OTHER"] || 0);

      const totalExp = parseFloat((electricity + paymentFee + maintenance + other).toFixed(2));
      const profit = parseFloat((netRev - totalExp).toFixed(2));
      const margin = rev > 0 ? parseFloat(((profit / rev) * 100).toFixed(1)) : 0;
      const revPerKwh = kwh > 0 ? parseFloat((rev / kwh).toFixed(2)) : 0;

      results.push({
        id: st.id,
        stationId: st.station_id,
        stationName: st.station_name,
        city: st.city,
        status: st.status,
        approvalStatus: st.approval_status,
        chargerCount: parseInt(st.charger_count || 0, 10),
        grossRevenue: rev,
        refunds: ref,
        netCollections: netRev,
        totalKwh: kwh,
        totalSessions: sessions,
        electricityCosts: electricity,
        paymentFees: paymentFee,
        maintenanceExpenses: maintenance,
        otherExpenses: other,
        totalExpenses: totalExp,
        operatingProfit: profit,
        profitMargin: margin,
        revenuePerKwh: revPerKwh,
      });
    }

    res.json({ success: true, stations: results });
  } catch (err) {
    console.error("getOwnerProfitabilityStations error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. GET /api/owner/profitability/trends
 * Aggregates daily, weekly, and monthly trend sequences for charting.
 */
export const getOwnerProfitabilityTrends = async (req, res) => {
  try {
    const { stationId, timeframe = "daily", days = 14 } = req.query;
    const stationIds = await getOwnerStationIds(req, stationId);

    if (stationIds.length === 0) {
      return res.json({ success: true, trends: [] });
    }

    const stPlaceholders = stationIds.map(() => "?").join(",");
    const numDays = Math.min(60, Math.max(7, parseInt(days, 10) || 14));

    // Daily breakdown for the past N days
    const dailyData = [];
    const now = new Date();

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      // Payments on that date
      const pRows = await query(
        `SELECT COALESCE(SUM(p.amount), 0) as rev, COALESCE(SUM(p.refund_amount), 0) as ref
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         WHERE b.station_id IN (${stPlaceholders})
           AND p.payment_status IN ('SUCCESS', 'PAID', 'REFUNDED')
           AND DATE(p.created_at) = ?`,
        [...stationIds, dateStr]
      );
      let dayRev = parseFloat(pRows[0]?.rev || 0);
      let dayRef = parseFloat(pRows[0]?.ref || 0);

      if (dayRev === 0) {
        const bRows = await query(
          `SELECT COALESCE(SUM(estimated_amount), 0) as rev
           FROM bookings
           WHERE station_id IN (${stPlaceholders})
             AND payment_status IN ('PAID', 'SUCCESS')
             AND DATE(created_at) = ?`,
          [...stationIds, dateStr]
        );
        dayRev = parseFloat(bRows[0]?.rev || 0);
      }

      const dayNet = Math.max(0, dayRev - dayRef);

      // Sessions & kWh
      const sRows = await query(
        `SELECT COALESCE(SUM(energy_kwh), 0) as kwh, COUNT(*) as sessions
         FROM charging_sessions
         WHERE station_id IN (${stPlaceholders})
           AND session_status IN ('COMPLETED', 'ACTIVE', 'CHARGING', 'IN_PROGRESS')
           AND DATE(created_at) = ?`,
        [...stationIds, dateStr]
      );
      const dayKwh = parseFloat(sRows[0]?.kwh || 0);
      const daySessions = parseInt(sRows[0]?.sessions || 0, 10);

      // Expenses on that date
      const expRows = await query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM station_expenses
         WHERE station_id IN (${stPlaceholders})
           AND expense_date = ?`,
        [...stationIds, dateStr]
      );
      let dayExpenses = parseFloat(expRows[0]?.total || 0);

      // If no electricity expense logged, add estimated electricity from kWh
      if (dayExpenses === 0 && dayKwh > 0) {
        dayExpenses = parseFloat((dayKwh * 8.5).toFixed(2));
      }

      const dayProfit = parseFloat((dayNet - dayExpenses).toFixed(2));

      dailyData.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        grossRevenue: dayRev,
        netCollections: dayNet,
        expenses: dayExpenses,
        operatingProfit: dayProfit,
        energyKwh: dayKwh,
        sessionsCount: daySessions,
      });
    }

    res.json({ success: true, trends: dailyData });
  } catch (err) {
    console.error("getOwnerProfitabilityTrends error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. GET /api/owner/expenses
 * Paginated list of operating expenses for the owner's stations.
 */
export const getOwnerExpenses = async (req, res) => {
  try {
    const { stationId, category, startDate, endDate } = req.query;
    const { page, limit, offset, search, sortBy, sortOrder } = parsePagination(req, 10, 50);

    const stationIds = await getOwnerStationIds(req, stationId);
    if (stationIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: buildPaginationMeta(0, page, limit),
      });
    }

    const stPlaceholders = stationIds.map(() => "?").join(",");
    let sql = `
      SELECT se.*, s.station_name, s.city, u.name as created_by_name
      FROM station_expenses se
      JOIN stations s ON se.station_id = s.id
      JOIN users u ON se.created_by = u.id
      WHERE se.station_id IN (${stPlaceholders})
    `;
    const params = [...stationIds];

    if (category && category !== "ALL") {
      sql += " AND se.category = ?";
      params.push(category);
    }

    if (startDate && endDate) {
      sql += " AND (se.expense_date BETWEEN ? AND ?)";
      params.push(startDate, endDate);
    }

    if (search) {
      sql += " AND (se.expense_id LIKE ? OR se.description LIKE ? OR s.station_name LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Count total matching
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as sub`;
    const countRows = await query(countSql, params);
    const totalItems = parseInt(countRows[0]?.total || 0, 10);

    // Sorting & Pagination
    sql += ` ORDER BY se.expense_date DESC, se.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await query(sql, params);

    res.json({
      success: true,
      data: rows,
      pagination: buildPaginationMeta(totalItems, page, limit),
    });
  } catch (err) {
    console.error("getOwnerExpenses error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. POST /api/owner/expenses
 * Create a new verified operating expense record.
 */
export const createOwnerExpense = async (req, res) => {
  try {
    const { stationId, category, amount, currency = "INR", expenseDate, description, documentReference } = req.body;

    const numStationId = parseInt(stationId, 10);
    const numAmount = parseFloat(amount);

    if (!numStationId || isNaN(numStationId)) {
      return res.status(400).json({ success: false, message: "A valid Station ID is required." });
    }

    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a positive number." });
    }

    const validCategories = [
      "ELECTRICITY",
      "MAINTENANCE",
      "PAYMENT_FEE",
      "RENT_LEASE",
      "INSURANCE",
      "INTERNET_TELECOM",
      "EQUIPMENT",
      "OTHER",
    ];

    if (!category || !validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
      });
    }

    // Verify Station Ownership
    const ownerId = getOwnerId(req);
    let verifySql = "SELECT id, station_name FROM stations WHERE id = ?";
    const verifyParams = [numStationId];
    if (!isAdmin(req)) {
      verifySql += " AND owner_id = ?";
      verifyParams.push(ownerId);
    }

    const stRows = await query(verifySql, verifyParams);
    if (stRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have permission to log expenses for this station.",
      });
    }

    const validDate = expenseDate ? new Date(expenseDate) : new Date();
    const formattedDate = validDate.toISOString().split("T")[0];

    // Prevent duplicate expense submissions (within 30 seconds for same station, category, and amount)
    const dupeCheck = await query(
      `SELECT id FROM station_expenses 
       WHERE station_id = ? AND category = ? AND amount = ? AND expense_date = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
       LIMIT 1`,
      [numStationId, category.toUpperCase(), numAmount, formattedDate]
    );

    if (dupeCheck.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Duplicate expense detected: An identical expense was recorded moments ago.",
      });
    }

    const expenseId = await getNextExpenseId();

    const insertSql = `
      INSERT INTO station_expenses 
      (expense_id, station_id, category, amount, currency, expense_date, description, document_reference, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(insertSql, [
      expenseId,
      numStationId,
      category.toUpperCase(),
      numAmount,
      currency,
      formattedDate,
      description || null,
      documentReference || null,
      ownerId,
    ]);

    const createdRows = await query("SELECT * FROM station_expenses WHERE id = ?", [result.insertId]);

    res.status(201).json({
      success: true,
      message: "Operating expense recorded successfully.",
      data: createdRows[0],
    });
  } catch (err) {
    console.error("createOwnerExpense error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. PUT /api/owner/expenses/:expenseId
 * Update an existing operating expense record.
 */
export const updateOwnerExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { category, amount, expenseDate, description, documentReference } = req.body;

    const existingRows = await query(
      "SELECT se.*, s.owner_id FROM station_expenses se JOIN stations s ON se.station_id = s.id WHERE se.id = ? OR se.expense_id = ?",
      [expenseId, expenseId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Expense record not found." });
    }

    const expense = existingRows[0];

    // Ownership check
    if (!isAdmin(req) && expense.owner_id !== getOwnerId(req)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Access denied." });
    }

    const updates = [];
    const params = [];

    if (category) {
      updates.push("category = ?");
      params.push(category.toUpperCase());
    }

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, message: "Amount must be a positive number." });
      }
      updates.push("amount = ?");
      params.push(numAmount);
    }

    if (expenseDate) {
      updates.push("expense_date = ?");
      params.push(new Date(expenseDate).toISOString().split("T")[0]);
    }

    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description);
    }

    if (documentReference !== undefined) {
      updates.push("document_reference = ?");
      params.push(documentReference);
    }

    if (updates.length > 0) {
      params.push(expense.id);
      await query(`UPDATE station_expenses SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    const updatedRows = await query("SELECT * FROM station_expenses WHERE id = ?", [expense.id]);

    res.json({
      success: true,
      message: "Expense record updated successfully.",
      data: updatedRows[0],
    });
  } catch (err) {
    console.error("updateOwnerExpense error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. DELETE /api/owner/expenses/:expenseId
 * Delete an operating expense record with strict ownership check.
 */
export const deleteOwnerExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const existingRows = await query(
      "SELECT se.*, s.owner_id FROM station_expenses se JOIN stations s ON se.station_id = s.id WHERE se.id = ? OR se.expense_id = ?",
      [expenseId, expenseId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Expense record not found." });
    }

    const expense = existingRows[0];

    // Ownership check
    if (!isAdmin(req) && expense.owner_id !== getOwnerId(req)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Access denied." });
    }

    await query("DELETE FROM station_expenses WHERE id = ?", [expense.id]);

    res.json({
      success: true,
      message: "Expense record deleted successfully.",
      deletedId: expense.id,
    });
  } catch (err) {
    console.error("deleteOwnerExpense error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
