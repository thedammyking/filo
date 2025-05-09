export const RESTRICTED_IP_RANGES: { [key: string]: string } = {
  // Standard private ranges
  private: 'private',
  loopback: 'loopback',
  // Carrier-Grade NAT
  carrierGradeNat: '100.64.0.0/10',
  // Link-local
  linkLocal: 'linkLocal',
  // Reserved
  reserved: 'reserved',
  // Cloud Metadata Services (common ones)
  awsMetadata: '169.254.169.254/32',
  gcpMetadata: '169.254.169.254/32', // Same IP used by GCP/Azure/etc.
  aliyunMetadata: '100.100.100.200/32'
};
