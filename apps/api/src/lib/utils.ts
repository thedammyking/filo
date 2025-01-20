import { uid } from 'uid/secure';

export const generatePrefixedUUID = (prefix: string = ''): string => {
  return prefixText(uid(25), prefix);
};

export const prefixText = (text: string, prefix: string = '', separator: string = '_'): string => {
  return `${prefix}${separator}${text}`;
};
