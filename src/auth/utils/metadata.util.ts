import { Request } from 'express';

export interface RequestMetadata {
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
}

export function extractMetadataFromRequest(req: Request): RequestMetadata {
  // Extract IP address
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    '';

  // Extract User-Agent
  const userAgent = req.headers['user-agent'] || '';

  // Parse User-Agent to extract device, browser, and OS
  const { device, browser, os } = parseUserAgent(userAgent);

  return {
    ip: ip.toString(),
    userAgent: userAgent.toString(),
    device,
    browser,
    os,
    country: undefined, // Can be enhanced with GeoIP service if needed
  };
}

function parseUserAgent(userAgent: string): {
  device: string;
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad'))
    os = 'iOS';

  // Detect Browser
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  else if (ua.includes('brave')) browser = 'Brave';
  else if (ua.includes('vivaldi')) browser = 'Vivaldi';
  else if (ua.includes('opera mini')) browser = 'Opera Mini';
  else if (ua.includes('opera mobile')) browser = 'Opera Mobile';
  else if (ua.includes('opera tablet')) browser = 'Opera Tablet';
  else if (ua.includes('opera desktop')) browser = 'Opera Desktop';
  else if (ua.includes('opera webkit')) browser = 'Opera Webkit';
  else if (ua.includes('opera blink')) browser = 'Opera Blink';

  // Detect Device
  let device = 'Desktop';
  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';

  return { device, browser, os };
}
