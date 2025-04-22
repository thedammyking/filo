export const cloudProviderKeys = {
  cloudProvider: () => ['cloud-providers'],
  activeCloudProvider: () => [...cloudProviderKeys.cloudProvider(), 'active']
};
