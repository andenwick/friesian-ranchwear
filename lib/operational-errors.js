const SAFE_CODE = /^(?:P\d{4}|[A-Z][A-Z0-9_]{2,63})$/;

export function operationalErrorCode(error, fallback = 'UNEXPECTED_ERROR') {
  return typeof error?.code === 'string' && SAFE_CODE.test(error.code)
    ? error.code
    : fallback;
}
