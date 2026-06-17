import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

// ─── Code Signing Configuration ───────────────────────────────────────────
// IMPORTANT: Signing certificates and passwords must be provided via
// environment variables. Do NOT hardcode secrets in this file.
//
// macOS:
//   CSC_NAME          — Common Name of the signing certificate in Keychain
//   CSC_LINK          — Base64-encoded .p12 certificate (alternative to CSC_NAME)
//   CSC_KEYCHAIN      — Keychain to search for the certificate
//   APPLE_ID                  — Apple ID for notarization
//   APPLE_APP_SPECIFIC_PASSWORD — App-specific password for notarization
//   APPLE_TEAM_ID             — Developer Team ID for notarization
//
// Windows:
//   WINDOWS_CERT_FILE     — Path to the .pfx certificate file
//   WINDOWS_CERT_PASSWORD — Password for the certificate file
//   WINDOWS_SIGN_PARAMS   — Additional signtool.exe parameters (optional)
// ───────────────────────────────────────────────────────────────────────────

const isMacSignEnabled = Boolean(process.env.CSC_NAME || process.env.CSC_LINK);
const isWinSignEnabled = Boolean(process.env.WINDOWS_CERT_FILE);

const config: ForgeConfig = {
  packagerConfig: {
    name: 'LegalVu',
    executableName: 'LegalVu',
    icon: undefined,
    asar: true,
    extraResource: [],
    win32metadata: {
      CompanyName: 'LegalVu',
      ProductName: 'LegalVu - Legal Workspace',
      FileDescription: 'AI-powered legal workspace for contract lifecycle management',
      OriginalFilename: 'LegalVu.exe',
    },
    // ── macOS code signing ──
    osxSign: isMacSignEnabled
      ? {
          identity: process.env.CSC_NAME || undefined,
          hardenedRuntime: true,
          entitlements: 'build/entitlements.mac.plist',
          'entitlements-inherit': 'build/entitlements.mac.plist',
          'gatekeeper-assess': false,
        }
      : undefined,
    // ── Windows code signing (signtool options) ──
    win32Sign: isWinSignEnabled
      ? {
          certificateFile: process.env.WINDOWS_CERT_FILE,
          certificatePassword: process.env.WINDOWS_CERT_PASSWORD,
          signWithParams: process.env.WINDOWS_SIGN_PARAMS || undefined,
        }
      : undefined,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'LegalVu',
      setupExe: 'LegalVuSetup.exe',
      title: 'LegalVu',
      authors: 'LegalVu',
      description: 'AI-powered legal workspace for contract lifecycle management',
      // Squirrel.Windows signing config — uses the same env vars
      certificateFile: process.env.WINDOWS_CERT_FILE || undefined,
      certificatePassword: process.env.WINDOWS_CERT_PASSWORD || undefined,
      signingHook: undefined,
    }),
    new MakerZIP({}, ['darwin', 'win32']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;