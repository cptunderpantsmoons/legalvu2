export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  passwordHash: string;
  aiApiKeyEncrypted?: string;
  createdAt: number;
}
