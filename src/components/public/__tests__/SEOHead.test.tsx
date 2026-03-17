import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SEOHead } from '../SEOHead';

afterEach(() => {
  cleanup();
  // Clean up meta tags and link elements added during test
  document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="robots"], meta[name="description"]').forEach(el => el.remove());
  document.querySelectorAll('link[rel="canonical"], link[hreflang]').forEach(el => el.remove());
});

describe('SEOHead', () => {
  it('sets document title', () => {
    render(<SEOHead title="About Us" />);
    expect(document.title).toContain('About Us');
    expect(document.title).toContain('Demo Credit Union');
  });

  it('sets meta description', () => {
    render(<SEOHead title="Test" description="Page description" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toBe('Page description');
  });

  it('sets Open Graph tags', () => {
    render(<SEOHead title="OG Test" ogTitle="Custom OG Title" />);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute('content')).toBe('Custom OG Title');
  });

  it('sets robots noindex when specified', () => {
    render(<SEOHead title="Hidden" noIndex />);
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('noindex');
  });

  it('sets robots index by default', () => {
    render(<SEOHead title="Public" />);
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('index, follow');
  });

  it('sets canonical URL', () => {
    render(<SEOHead title="Canon" canonicalUrl="https://example.com/page" />);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute('href')).toBe('https://example.com/page');
  });

  it('sets Twitter card meta', () => {
    render(<SEOHead title="Twitter" twitterCard="summary" />);
    const card = document.querySelector('meta[name="twitter:card"]');
    expect(card?.getAttribute('content')).toBe('summary');
  });

  it('sets default Twitter card to summary_large_image', () => {
    render(<SEOHead title="Default" />);
    const card = document.querySelector('meta[name="twitter:card"]');
    expect(card?.getAttribute('content')).toBe('summary_large_image');
  });

  it('sets og:site_name', () => {
    render(<SEOHead title="Test" />);
    const siteName = document.querySelector('meta[property="og:site_name"]');
    expect(siteName?.getAttribute('content')).toContain('Demo Credit Union');
  });
});
