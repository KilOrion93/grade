import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateToken(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  if (seconds < 2592000) return `il y a ${Math.floor(seconds / 86400)}j`;
  return formatDate(date);
}

export const REVIEW_CRITERIA = [
  { key: "accueil", label: "Accueil", icon: "smile" },
  { key: "hygiene", label: "Hygiène", icon: "sparkles" },
  { key: "rapidite", label: "Rapidité", icon: "clock" },
  { key: "prix", label: "Prix", icon: "wallet" },
  { key: "qualite", label: "Qualité", icon: "chef-hat" },
] as const;

export type CriterionKey = (typeof REVIEW_CRITERIA)[number]["key"];

export function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function computeTrustScore(params: {
  hasComment: boolean;
  criteriaCount: number;
  tokenAge: number;
}): number {
  let score = 50;
  if (params.hasComment) score += 20;
  if (params.criteriaCount >= 5) score += 15;
  if (params.tokenAge < 24 * 60 * 60 * 1000) score += 15;
  return Math.min(score, 100);
}

