/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep visited pages in the client router cache so switching tabs back and
    // forth is instant. Saving anything (server actions) clears it.
    staleTimes: { dynamic: 30, static: 300 },
  },
};
export default nextConfig;
