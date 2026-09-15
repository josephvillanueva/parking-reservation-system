import type { NextApiRequest, NextApiResponse } from "next"

export interface IContext {
  req: NextApiRequest
  res: NextApiResponse
  userId: number | null
}

export function requireUser(context: IContext): number {
  if (!context.userId) throw new Error("Authentication required")
  return context.userId
}

