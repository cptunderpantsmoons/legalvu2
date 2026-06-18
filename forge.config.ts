import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import path from 'path';

/**
 * Code signing configuration:
 *
 * Windows: set WINDOWS_CERTIFICATE_PATH and WINDOWS_CERTIFICATE_PASSWORD
 *           (PFX file). The MakerSquirrel `certificateFile` and
 *           `certificatePassword` options are used.
 *
 * macOS:   set APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID,
 *           CSC_LINK (p12 base64 or file URL), CSC_KEY_PASSWORD,
 *           and an entitlements file via OSX_ENTITLEMENTS.
 */
const windowsSigning =
  process.env.WINDOWS_CERTIFICATE_PATH && process.env.WINDOWS_CERTIFICATE_PASSWORD
    ? {
        certificateFile: process.env.WINDOWS_CERTIFICATE_PATH,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
      }
    : undefined;

const osxSigning =
  process.env.CSC_LINK && process.env.CSC_KEY_PASSWORD
    ? true
    : undefined;

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
    osxSign: osxSigning
      ? ({
          identity: 'Developer ID Application: LegalVu',
          hardenedRuntime: true,
          entitlements: process.env.OSX_ENTITLEMENTS || path.join(__dirname, 'entitlements.plist'),
          entitlementsInherit: process.env.OSX_ENTITLEMENTS || path.join(__dirname, 'entitlements.plist'),
          signatureFlags: 'library',
        } as any)
      : undefined,
    osxNotarize: process.env.APPLE_ID && process.env.APPLE_ID_PASSWORD && process.env.APPLE_TEAM_ID
      ? {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_ID_PASSWORD,
          teamId: process.env.APPLE_TEAM_ID,
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
      ...(windowsSigning ? { certificateFile: windowsSigning.certificateFile, certificatePassword: windowsSigning.certificatePassword } : {}),
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
