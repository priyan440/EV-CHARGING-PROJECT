-- ============================================================
-- EV CHARGING MANAGEMENT SYSTEM - DEMO SEED DATA (OPTIONAL)
-- Default password for all demo accounts: password123
-- Bcrypt Hash: $2a$10$FQRTNYfy2jhbIbEluqSckey5YqR4.Kwolex524LPetP4h8gR911sy
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. SEED USERS (ADMIN, OWNER, EV CUSTOMER)
INSERT INTO users (id, user_id, name, email, password_hash, phone, role, status, company_name, address, city, state, pincode, wallet_balance)
VALUES 
(1, 'ADM000001', 'System Administrator', 'admin@evcharge.com', '$2a$10$FQRTNYfy2jhbIbEluqSckey5YqR4.Kwolex524LPetP4h8gR911sy', '+91 9876543210', 'ADMIN', 'ACTIVE', 'EV Charge Hub HQ', '100 EV Expressway', 'Chennai', 'Tamil Nadu', '600001', 50000.00),
(2, 'OWN000001', 'GreenPower Owner', 'owner@greenpower.com', '$2a$10$FQRTNYfy2jhbIbEluqSckey5YqR4.Kwolex524LPetP4h8gR911sy', '+91 9876543211', 'STATION_OWNER', 'ACTIVE', 'GreenPower Charging Ltd', '45 Guindy Industrial Estate', 'Chennai', 'Tamil Nadu', '600032', 25000.00),
(3, 'CUS000001', 'Alex Demo Driver', 'driver@evcharge.com', '$2a$10$FQRTNYfy2jhbIbEluqSckey5YqR4.Kwolex524LPetP4h8gR911sy', '+91 9876543212', 'USER', 'ACTIVE', 'N/A', '12 Velachery Main Road', 'Chennai', 'Tamil Nadu', '600042', 3500.00)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 1B. SEED STATION OWNER PROFILE
INSERT INTO station_owners (id, user_id, owner_code, business_name, business_email, business_phone, address, verification_status)
VALUES
(1, 2, 'OWN-001', 'GreenPower Charging Ltd', 'owner@greenpower.com', '+91 9876543211', '45 Guindy Industrial Estate, Chennai', 'VERIFIED')
ON DUPLICATE KEY UPDATE business_name = VALUES(business_name);

-- 2. SEED VEHICLES
INSERT INTO vehicles (id, vehicle_id, user_id, registration_number, vehicle_type, brand, model, battery_capacity, connector_type)
VALUES
(1, 'VEH000001', 3, 'TN-01-EV-2026', '4W', 'Tata', 'Nexon EV Max', 40.50, 'CCS2')
ON DUPLICATE KEY UPDATE model = VALUES(model);

-- 2B. SEED BATTERY DETAILS
INSERT INTO battery_details (id, vehicle_id, battery_capacity, battery_type, current_percentage, health_percentage, temperature)
VALUES
(1, 1, 40.50, 'Lithium-ion NMC', 45.00, 98.50, 31.00)
ON DUPLICATE KEY UPDATE current_percentage = VALUES(current_percentage);

-- 3. SEED CHARGING STATIONS
INSERT INTO stations (id, station_id, owner_id, station_name, address, city, state, pincode, latitude, longitude, opening_time, closing_time, contact_number, total_slots, available_slots, max_power, status, approval_status, amenities)
VALUES
(1, 'STN000001', 2, 'GreenPower Fast Hub - Guindy', '45 Guindy Industrial Estate', 'Chennai', 'Tamil Nadu', '600032', 13.0067000, 80.2025000, '00:00 AM', '11:59 PM', '+91 9876543211', 4, 3, 120.00, 'ACTIVE', 'APPROVED', 'WiFi, Cafe, Restroom, 24/7 Security'),
(2, 'STN000002', 2, 'GreenPower Supercharge - OMR', '102 OMR IT Corridor', 'Chennai', 'Tamil Nadu', '600096', 12.9352000, 80.2295000, '06:00 AM', '11:00 PM', '+91 9876543211', 4, 4, 150.00, 'ACTIVE', 'APPROVED', 'WiFi, Lounge, Food Court')
ON DUPLICATE KEY UPDATE station_name = VALUES(station_name);

-- 4. SEED CHARGERS
INSERT INTO chargers (id, charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
VALUES
(1, 'CHG000001', 1, 'Guindy Hyper Charger #1', 'DC_FAST', 120.00, 'AVAILABLE', 2),
(2, 'CHG000002', 1, 'Guindy AC Fast Charger #2', 'AC', 22.00, 'AVAILABLE', 2),
(3, 'CHG000003', 2, 'OMR Ultra Charger #1', 'DC_FAST', 150.00, 'AVAILABLE', 2)
ON DUPLICATE KEY UPDATE charger_name = VALUES(charger_name);

-- 5. SEED CHARGER CONNECTORS
INSERT INTO charger_connectors (id, connector_id, charger_id, connector_type, power_kw, status)
VALUES
(1, 'CON000001', 1, 'CCS2', 60.00, 'AVAILABLE'),
(2, 'CON000002', 1, 'CHAdeMO', 60.00, 'AVAILABLE'),
(3, 'CON000003', 2, 'Type 2 AC', 22.00, 'AVAILABLE'),
(4, 'CON000004', 3, 'CCS2', 75.00, 'AVAILABLE'),
(5, 'CON000005', 3, 'CCS2', 75.00, 'AVAILABLE')
ON DUPLICATE KEY UPDATE connector_type = VALUES(connector_type);

-- 6. SEED TARIFFS
INSERT INTO tariffs (id, tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, peak_start, peak_end, status)
VALUES
(1, 'TAR000001', 1, 18.00, 22.00, 14.00, 15.00, 2.00, '18:00', '22:00', 'ACTIVE'),
(2, 'TAR000002', 2, 19.50, 24.00, 15.00, 20.00, 2.50, '18:00', '22:00', 'ACTIVE')
ON DUPLICATE KEY UPDATE base_rate_per_kwh = VALUES(base_rate_per_kwh);

SET FOREIGN_KEY_CHECKS = 1;
