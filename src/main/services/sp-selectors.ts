export interface SharePointSelectors {
  version: string;
  fileItem: string;
  fileName: string;
  fileLink: string;
  fileSize: string;
  fileModified: string;
  folderItem: string;
  folderName: string;
  uploadButton: string;
  uploadInput: string;
  uploadConfirm: string;
  loginIndicator: string;
  loginUrlPattern: string;
}

const DEFAULT_SELECTORS: SharePointSelectors = {
  version: 'spo-2024',
  fileItem: '[data-automationid="detailsListRow"], [role="row"][data-list-index]',
  fileName: '[data-automationid="name"] a, [data-automationid="NameCellLink"] a, button[data-automationid="FieldRenderer-name"]',
  fileLink: '[data-automationid="name"] a, [data-automationid="NameCellLink"] a',
  fileSize: '[data-automationid="size"], [aria-label*="File size"]',
  fileModified: '[data-automationid="modified"], [aria-label*="Modified"]',
  folderItem: '[data-automationid="detailsListRow"][data-isfolder="true"], [role="row"] img[alt*="folder"]',
  folderName: '[data-automationid="name"] button, [data-automationid="NameCellLink"] button',
  uploadButton: 'button[name="Upload"], button[aria-label*="Upload"], button[data-automationid="uploadCommand"]',
  uploadInput: 'input[type="file"]',
  uploadConfirm: 'button[data-automationid="uploadBtn"], button[name="OK"]',
  loginIndicator: 'img[alt*="Microsoft"], div[data-automationid="UserProfileCard"]',
  loginUrlPattern: 'login.microsoftonline.com, login.live.com, /_layouts/15/Authenticate.aspx',
};

export function getSelectors(customOverride?: Partial<SharePointSelectors>): SharePointSelectors {
  return { ...DEFAULT_SELECTORS, ...customOverride };
}

export function isLoginUrl(url: string, selectors: SharePointSelectors): boolean {
  const patterns = selectors.loginUrlPattern.split(',').map((p) => p.trim());
  return patterns.some((p) => url.includes(p));
}

export type { SharePointSelectors as SpSelectors };
