// Form Validation Helpers

export function validateRegistrationForm(formData) {
  const errors = {};

  // Personal Details
  if (!formData.name?.trim()) {
    errors.name = "Please enter your full name.";
  }

  if (!formData.email?.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!formData.mobile?.trim()) {
    errors.mobile = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(formData.mobile.trim().replace(/[- ]/g, ""))) {
    errors.mobile = "Mobile number must contain exactly 10 digits.";
  }

  if (!formData.password) {
    errors.password = "Password is required.";
  } else if (formData.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!formData.address?.trim()) {
    errors.address = "Address is required.";
  }

  if (!formData.city?.trim()) {
    errors.city = "City is required.";
  }

  if (!formData.pincode?.trim()) {
    errors.pincode = "PIN code is required.";
  } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
    errors.pincode = "PIN code must be 6 digits.";
  }

  // Vehicle Details
  if (!formData.vehicleNumber?.trim()) {
    errors.vehicleNumber = "Please enter vehicle registration number.";
  }

  if (!formData.vehicleType) {
    errors.vehicleType = "Please select a vehicle type.";
  }

  if (!formData.brand?.trim()) {
    errors.brand = "Please enter EV brand.";
  }

  if (!formData.model?.trim()) {
    errors.model = "Please enter EV model.";
  }

  if (!formData.batteryCapacity) {
    errors.batteryCapacity = "Please enter battery capacity (kWh).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLoginForm(counterId, password) {
  const errors = {};

  if (!counterId?.trim()) {
    errors.counterId = "Please enter your Counter ID (e.g. CUS0001).";
  }

  if (!password) {
    errors.password = "Please enter your password.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
