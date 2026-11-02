/**
 * Call this from /api/orders/complete BEFORE a license is created.
 * A payment id by itself is not proof of payment.
 */
async function verifyRazorpayPayment(paymentId, expectedAmountInr) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error("Razorpay secret is not configured");
    error.status = 500;
    throw error;
  }
  if (!paymentId || typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    const error = new Error("Invalid payment");
    error.status = 400;
    throw error;
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const payment = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error("Payment not found");
    error.status = 402;
    throw error;
  }
  if (payment.status !== "captured" && payment.status !== "authorized") {
    const error = new Error("Payment is not captured");
    error.status = 402;
    throw error;
  }

  const expectedPaise = Math.round(Number(expectedAmountInr) * 100);
  if (!Number.isFinite(expectedPaise) || expectedPaise <= 0 || Number(payment.amount) < expectedPaise) {
    const error = new Error("Payment amount does not match the plan");
    error.status = 402;
    throw error;
  }
  return payment;
}

module.exports = { verifyRazorpayPayment };
