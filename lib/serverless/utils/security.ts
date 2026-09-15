import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto"
import { promisify } from "util"
import { getCookie, setCookies } from "cookies-next"
import type { NextApiRequest, NextApiResponse } from "next"

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = "parking_session"

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET
  return secret && secret.length >= 32 ? secret : null
}

function signature(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest()
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt$${salt}$${derivedKey.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("scrypt$")) {
    if (password.length !== stored.length) return false
    return timingSafeEqual(Buffer.from(password), Buffer.from(stored))
  }

  const [, salt, expectedHex] = stored.split("$")
  if (!salt || !expectedHex) return false
  const expected = Buffer.from(expectedHex, "hex")
  const actual = (await scrypt(password, salt, expected.length)) as Buffer
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function setSessionCookie(res: NextApiResponse, userId: number): void {
  const secret = sessionSecret()
  if (!secret) throw new Error("SESSION_SECRET must contain at least 32 characters")
  const value = String(userId)
  const token = `${value}.${signature(value, secret).toString("base64url")}`
  setCookies(SESSION_COOKIE, token, {
    req: undefined,
    res,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  })
}

export function clearSessionCookie(req: NextApiRequest, res: NextApiResponse): void {
  setCookies(SESSION_COOKIE, "", {
    req,
    res,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: -1,
    path: "/",
  })
}

export function getSessionUserId(req: NextApiRequest, res: NextApiResponse): number | null {
  const secret = sessionSecret()
  const token = getCookie(SESSION_COOKIE, { req, res })?.toString()
  if (!secret || !token) return null
  const separator = token.lastIndexOf(".")
  if (separator < 1) return null
  const value = token.slice(0, separator)
  const supplied = Buffer.from(token.slice(separator + 1), "base64url")
  const expected = signature(value, secret)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
  const userId = Number(value)
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null
}

