import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow dev asset requests from the control panel domain
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  // Format expects strings like "https://example.com" (optionally with port)
  allowedDevOrigins: [
    'https://panel.panlemcx.run.place',
    'http://panel.panlemcx.run.place',
  ],
}

export default nextConfig
