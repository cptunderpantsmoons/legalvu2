import { describe, it, expect } from 'vitest';
import { getSelectors, isLoginUrl } from './sp-selectors';

describe('sp-selectors', () => {
  it('getSelectors returns default selectors with all required fields', () => {
    const selectors = getSelectors();
    expect(selectors.version).toBe('spo-2024');
    expect(selectors.fileItem).toBeTruthy();
    expect(selectors.fileName).toBeTruthy();
    expect(selectors.uploadButton).toBeTruthy();
    expect(selectors.uploadInput).toBeTruthy();
    expect(selectors.loginUrlPattern).toBeTruthy();
  });

  it('getSelectors merges custom overrides', () => {
    const selectors = getSelectors({ fileItem: '.custom-row', version: 'custom-v1' });
    expect(selectors.fileItem).toBe('.custom-row');
    expect(selectors.version).toBe('custom-v1');
    expect(selectors.fileName).toBeTruthy();
  });

  it('isLoginUrl detects Microsoft login URLs', () => {
    expect(isLoginUrl('https://login.microsoftonline.com/common/oauth2/authorize', getSelectors())).toBe(true);
    expect(isLoginUrl('https://login.live.com/login.srf', getSelectors())).toBe(true);
    expect(isLoginUrl('https://tenant.sharepoint.com/_layouts/15/Authenticate.aspx', getSelectors())).toBe(true);
  });

  it('isLoginUrl returns false for SP site URLs', () => {
    expect(isLoginUrl('https://tenant.sharepoint.com/sites/legal/Shared%20Documents', getSelectors())).toBe(false);
    expect(isLoginUrl('https://tenant.sharepoint.com/sites/legal', getSelectors())).toBe(false);
  });
});
