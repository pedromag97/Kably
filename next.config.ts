import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer não deve ser empacotado pelo webpack (usa APIs Node).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
