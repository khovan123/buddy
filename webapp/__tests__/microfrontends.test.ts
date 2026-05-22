/* @jest-environment node */
import { validateRouting, validateMiddlewareConfig } from '@vercel/microfrontends/next/testing';
import { config } from '../src/proxy';

/**
 * Vercel Microfrontends routing validation tests.
 *
 * These tests use Vercel's official testing utilities to catch
 * misconfigurations before deployment. They validate that:
 *
 * 1. Path definitions in microfrontends.json correctly map to apps
 * 2. The proxy (middleware) matcher config is compatible with MFE routing
 *
 * @see https://vercel.com/docs/microfrontends/troubleshooting
 */
describe('microfrontends', () => {
	test('routing matches microfrontends.json configuration', () => {
		expect(() => {
			validateRouting('./microfrontends.json', {
				// "buddy" is the default application — it catches all unmatched routes.
				// List representative paths to verify the default app handles them.
				buddy: [
					// Intro (public)
					'/',
					'/about',
					'/pricing',
					'/faq',
					'/contact',
					'/how-it-works',

					// Auth (public)
					'/login',
					'/sign-up',
					'/otp',
					'/onboarding',

					// Private
					'/home',
					'/explore',
					'/library',
					'/dashboard',
					'/dashboard/majors',
					'/dashboard/tutorials',
					'/dashboard/resources',
					'/settings',
					'/settings/billing',
					'/profile',
					'/ask',
				],
			});
		}).not.toThrow();
	});

	test('proxy config is compatible with microfrontends routing', () => {
		expect(() =>
			validateMiddlewareConfig(config, './microfrontends.json'),
		).not.toThrow();
	});
});
