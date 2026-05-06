if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
