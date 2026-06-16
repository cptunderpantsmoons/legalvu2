import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

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
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'LegalVu',
      setupExe: 'LegalVuSetup.exe',
      title: 'LegalVu',
      authors: 'LegalVu',
      description: 'AI-powered legal workspace for contract lifecycle management',
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
