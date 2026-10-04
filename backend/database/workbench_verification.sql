-- ============================================================
-- MYSQL WORKBENCH VERIFICATION QUERIES
-- ============================================================

USE ev_charging_system;

-- 1. Verify User exists and has role
SELECT id, user_id, name, email, role, status FROM users;

-- 2. Verify Vehicle linked to user
SELECT v.id, v.vehicle_id, v.registration_number, v.brand, v.model, u.name as owner_name 
FROM vehicles v
JOIN users u ON v.user_id = u.id;

-- 3. Verify Stations & Chargers
SELECT s.id as station_id, s.station_name, s.city, u.name as owner_name, 
       COUNT(c.id) as total_chargers
FROM stations s
JOIN users u ON s.owner_id = u.id
LEFT JOIN chargers c ON c.station_id = s.id
GROUP BY s.id, s.station_name, s.city, u.name;

-- 4. Verify Single Booking Record Across Customer, Owner, Admin
SELECT 
    b.id,
    b.booking_id,
    u.name AS customer_name,
    u.email AS customer_email,
    s.station_name,
    s.owner_id,
    owner.name AS station_owner_name,
    v.registration_number,
    c.charger_name,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.estimated_amount,
    b.booking_status,
    b.payment_status,
    p.payment_id,
    p.amount AS payment_amount
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN stations s ON b.station_id = s.id
JOIN users owner ON s.owner_id = owner.id
JOIN chargers c ON b.charger_id = c.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
LEFT JOIN payments p ON (p.booking_id = b.id OR p.payment_id = b.payment_id)
ORDER BY b.id DESC;

-- 5. Verify Owner Dynamic Revenue Calculation from Successful Payments
SELECT 
    s.owner_id,
    owner.name AS owner_name,
    COUNT(p.id) AS successful_transactions,
    SUM(p.amount) AS gross_revenue,
    SUM(p.amount * 0.95) AS owner_net_revenue
FROM payments p
JOIN bookings b ON (p.booking_id = b.id OR p.payment_id = b.payment_id)
JOIN stations s ON b.station_id = s.id
JOIN users owner ON s.owner_id = owner.id
WHERE p.payment_status = 'SUCCESS'
GROUP BY s.owner_id, owner.name;

-- 6. Integrity check for NULL foreign keys
SELECT 
    COUNT(CASE WHEN booking_id IS NULL THEN 1 END) as null_booking_codes,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_users,
    COUNT(CASE WHEN station_id IS NULL THEN 1 END) as null_stations,
    COUNT(CASE WHEN charger_id IS NULL THEN 1 END) as null_chargers,
    COUNT(CASE WHEN tariff_id IS NULL THEN 1 END) as null_tariffs
FROM bookings;
