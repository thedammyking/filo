export const validateUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateMagnetLink = (magnetLink: string) => {
  const magnetLinkRegex = /^magnet:\?xt=urn:[a-z0-9]+:[a-zA-Z0-9]{32,}/i;
  return magnetLinkRegex.test(magnetLink);
};
