export function isValidPhoneNumber(phone) {
  if (!phone) {
    return null;
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneRegex = /^\d{10,15}$/;
  if (phoneRegex.test(cleanPhone)) {
    return cleanPhone;
  }
  return null;
} 