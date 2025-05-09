import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
import * as ipaddr from 'ipaddr.js';
import { URL } from 'url';
import { RESTRICTED_IP_RANGES } from './security.constants';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  /**
   * Checks if a given IP address falls into restricted ranges.
   */
  private isIpRestricted(ipAddress: string): boolean {
    try {
      const addr = ipaddr.parse(ipAddress);

      for (const rangeName in RESTRICTED_IP_RANGES) {
        const rangeValue = RESTRICTED_IP_RANGES[rangeName];
        if (rangeValue.includes('/')) {
          const subnet = ipaddr.parseCIDR(rangeValue);
          if (addr.match(subnet)) {
            this.logger.warn(
              `[SSRF Check] IP ${ipAddress} matches restricted CIDR range: ${rangeName} (${rangeValue})`
            );
            return true;
          }
        } else {
          if (addr.range() === rangeValue) {
            this.logger.warn(`[SSRF Check] IP ${ipAddress} matches restricted range: ${rangeName}`);
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      this.logger.error(`[SSRF Check] Failed to parse or check IP address: ${ipAddress}`, e.stack);
      return true; // Treat parse errors as potentially unsafe
    }
  }

  /**
   * Validates a URL to ensure it does not resolve to a restricted IP address.
   * Throws BadRequestException if the URL is unsafe or resolution fails.
   * @param urlString - The URL to validate.
   * @param logContext - Optional context for logging, e.g., userId or jobId.
   */
  async validateUrlSafety(urlString: string, logContext?: string): Promise<void> {
    const prefix = logContext ? `${logContext} ` : '';
    let urlObject: URL;
    try {
      urlObject = new URL(urlString);
    } catch (e) {
      this.logger.warn(`${prefix}[SSRF Check] Invalid URL format: ${urlString}`);
      throw new BadRequestException(`Invalid URL format: ${urlString}`);
    }

    const hostname = urlObject.hostname;
    if (!hostname) {
      this.logger.warn(`${prefix}[SSRF Check] Could not extract hostname from URL: ${urlString}`);
      throw new BadRequestException(`Could not extract hostname from URL: ${urlString}`);
    }

    this.logger.log(
      `${prefix}[SSRF Check] Resolving IP for hostname: ${hostname} (URL: ${urlString})`
    );
    let resolvedIp: string;
    try {
      const lookupResult = await dns.lookup(hostname);
      resolvedIp = lookupResult.address;
      this.logger.log(`${prefix}[SSRF Check] Resolved ${hostname} to IP: ${resolvedIp}`);
    } catch (dnsError) {
      this.logger.error(
        `${prefix}[SSRF Check] DNS lookup failed for hostname: ${hostname}`,
        dnsError.stack
      );
      throw new Error(`Could not resolve hostname: ${hostname}`); // Internal server error likely
    }

    if (this.isIpRestricted(resolvedIp)) {
      this.logger.error(
        `${prefix}[SSRF Check] URL ${urlString} resolves to a restricted IP address (${resolvedIp}). Access denied.`
      );
      throw new BadRequestException(
        `URL resolves to a restricted IP address (${resolvedIp}). Access denied.`
      );
    }
    this.logger.log(
      `${prefix}[SSRF Check] IP ${resolvedIp} for URL ${urlString} is not restricted. Proceeding.`
    );
  }
}
