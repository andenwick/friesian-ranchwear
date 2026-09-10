const ADMIN_FULFILLMENT_TRANSITIONS = Object.freeze({
  PAID: Object.freeze(['PROCESSING']),
  PROCESSING: Object.freeze(['SHIPPED']),
  SHIPPED: Object.freeze(['DELIVERED']),
});

export function getAllowedAdminOrderTransitions(status, paymentStatus = 'PAID') {
  if (paymentStatus !== 'PAID') return [];
  return ADMIN_FULFILLMENT_TRANSITIONS[status] || [];
}

export function canAdminTransitionOrder(fromStatus, toStatus, paymentStatus = 'PAID') {
  return getAllowedAdminOrderTransitions(fromStatus, paymentStatus).includes(toStatus);
}
