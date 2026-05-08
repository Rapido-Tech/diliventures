/**
 * IMEI Validation Utilities
 *
 * Implements the full Luhn algorithm as specified by GSMA for IMEI validation.
 * Reference: https://www.gsma.com/aboutus/workinggroups/terminal-steering-group/imei-allocation-and-approval-guidelines
 */

/**
 * Validates an IMEI string using the Luhn (mod-10) algorithm.
 *
 * Steps:
 *  1. Strip non-digits
 *  2. Ensure exactly 15 digits
 *  3. Apply Luhn checksum
 */
export function validateImei(raw: string): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  const digits = raw.replace(/\D/g, "");

  if (digits.length !== 15) {
    return {
      valid: false,
      error: `IMEI must be exactly 15 digits (got ${digits.length}).`,
    };
  }

  // Luhn check
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(digits[i], 10);
    // Double every second digit from the right (index 13, 11, 9 … i.e. even positions from the right)
    if ((15 - 1 - i) % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }

  if (sum % 10 !== 0) {
    return {
      valid: false,
      error: "IMEI failed Luhn checksum. Please double-check the number.",
    };
  }

  return { valid: true, normalized: digits };
}

/**
 * Quick guard — just length + digits, no Luhn.
 * Use for cheap client-side input masking.
 */
export function isImeiFormat(raw: string): boolean {
  return /^\d{15}$/.test(raw.replace(/\s/g, ""));
}
