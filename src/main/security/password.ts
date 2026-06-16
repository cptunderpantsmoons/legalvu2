import bcrypt from 'bcryptjs';

const COST = 12;

export function hashPassword(plaintext: string): string {
  return bcrypt.hashSync(plaintext, COST);
}

export function verifyPassword(plaintext: string, hash: string): boolean {
  if (!hash) return false;
  return bcrypt.compareSync(plaintext, hash);
}
