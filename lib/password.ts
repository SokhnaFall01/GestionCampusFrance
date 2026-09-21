import bcrypt from "bcryptjs";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Génère un mot de passe temporaire lisible pour un nouveau candidat.
export function generateTempPassword(): string {
  const words = ["Dakar", "Thies", "Saint-Louis", "Ziguinchor", "Kaolack", "Louga"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}${n}`;
}
