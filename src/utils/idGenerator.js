// Comprehensive Counter ID Generator for EV Charging Station Management System

const PREFIX_KEYS = {
  CUS: "ev_seq_cus",
  OWNER: "ev_seq_owner",
  STA: "ev_seq_sta",
  CHG: "ev_seq_chg",
  BK: "ev_seq_bk",
  SES: "ev_seq_ses",
  PAY: "ev_seq_pay",
  INV: "ev_seq_inv",
  MT: "ev_seq_mt",
  CMP: "ev_seq_cmp",
  VEH: "ev_seq_veh",
  ADM: "ev_seq_adm",
  TECH: "ev_seq_tech",
};

/**
 * Get next formatted counter ID for a given entity prefix
 * @param {string} prefix - Entity prefix (CUS, OWNER, STA, CHG, BK, SES, PAY, INV, MT, CMP, VEH, ADM, TECH)
 * @param {number} padding - Zero padding length
 */
export function generateCounterId(prefix, padding = 4) {
  const storageKey = PREFIX_KEYS[prefix] || `ev_seq_${prefix.toLowerCase()}`;
  const currentSeq = parseInt(localStorage.getItem(storageKey) || "0", 10);
  const nextSeq = currentSeq + 1;
  localStorage.setItem(storageKey, nextSeq.toString());
  return `${prefix}${nextSeq.toString().padStart(padding, "0")}`;
}

export const getNextCustomerId = () => generateCounterId("CUS", 4);
export const getNextOwnerId = () => generateCounterId("OWNER", 4);
export const getNextAdminId = () => generateCounterId("ADM", 4);
export const getNextStationId = () => generateCounterId("STA", 3);
export const getNextChargerId = () => generateCounterId("CHG", 4);
export const getNextBookingId = () => generateCounterId("BK", 6);
export const getNextSessionId = () => generateCounterId("SES", 6);
export const getNextPaymentId = () => generateCounterId("PAY", 6);
export const getNextInvoiceId = () => generateCounterId("INV", 6);
export const getNextMaintenanceId = () => generateCounterId("MT", 6);
export const getNextComplaintId = () => generateCounterId("CMP", 6);
export const getNextVehicleId = () => generateCounterId("VEH", 3);
export const getNextTechnicianId = () => generateCounterId("TECH", 4);

// Backward compatibility alias
export const getNextCounterId = getNextCustomerId;
