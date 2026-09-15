/* eslint-disable no-empty */
import "reflect-metadata"
import { ApolloServer } from "apollo-server-micro"
import type { NextApiRequest, NextApiResponse, PageConfig } from "next"
import { buildSchema } from "type-graphql"

import { AppDataSource } from "../../../lib/serverless/utils/db"
import { ParkingLotResolver } from "../../../lib/serverless/graphql/resolvers/ParkingLotResolver"
import { VehicleResolver } from "../../../lib/serverless/graphql/resolvers/VehicleResolver"
import { UserResolver } from "../../../lib/serverless/graphql/resolvers/UserResolver"
import { send } from "micro"
import { getSessionUserId } from "../../../lib/serverless/utils/security"

// disable next js from handling this route
export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
}

const apolloServer = new ApolloServer({
  schema: await buildSchema({
    resolvers: [UserResolver, ParkingLotResolver, VehicleResolver],
    authChecker: ({ context }) => Boolean(context.userId),
  }),
  context: async ({ req, res }) => {
    try {
      await AppDataSource.initialize()
    } catch (_) {}

    return {
      req,
      res,
      userId: getSessionUserId(req, res),
    }
  },
  introspection: process.env.NODE_ENV !== "production",
  csrfPrevention: true,
})

await apolloServer.start()

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS")
    return send(res, 204, "")
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS")
    return send(res, 405, "Method not allowed")
  }

  return apolloServer.createHandler({
    path: "/api/graphql",
  })(req, res)
}

