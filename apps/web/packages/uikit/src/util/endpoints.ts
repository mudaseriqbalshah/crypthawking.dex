// CryptoHawking: no upstream PancakeSwap CDN. Empty base => relative /web/... paths
// served from our own public/ (missing files 404 locally, never leak to a Pancake host).
export const ASSET_CDN = process.env.NEXT_PUBLIC_ASSET_CDN || "";
