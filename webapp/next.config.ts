import type { NextConfig } from 'next';

import { withMicrofrontends } from '@vercel/microfrontends/next/config';

const API_GATEWAY_URL =
	process.env.NEXT_API_BASE_URL ||
	process.env.NEXT_PUBLIC_API_BASE_URL ||
	"https://api-gateway-622307400032.asia-southeast1.run.app";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "**",
			},
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
	async rewrites() {
		return [
			{
				source: "/v1/:path*",
				destination: `${API_GATEWAY_URL}/v1/:path*`,
			},
		];
	},
};

export default withMicrofrontends(nextConfig, {
	debug: process.env.MFE_DEBUG === '1',
});
