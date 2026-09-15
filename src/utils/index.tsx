import React, { useEffect } from "react"
import { useRouter } from "next/router"
import { useLazyQuery, useQuery } from "@apollo/client"
import { ME } from "../queries"
import client from "../../apollo-client"

export const currencyFormat = (x: number) => {
  return x
    .toFixed(2)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export const toErrorMap = (errors: any[]) => {
  const errorMap: Record<string, string> = {}
  errors.forEach(({ field, message }) => {
    errorMap[field] = message
  })
  return errorMap
}

export function withAuth(gssp: any) {
  return async (context: any) => {
    const gsspData = await gssp(context)

    if (gsspData.redirect) {
      return {
        redirect: {
          ...gsspData.redirect,
        },
      }
    }

    try {
        const { data } = await client.query({
          query: ME,
          fetchPolicy: "no-cache",
          context: { headers: { cookie: context.req.headers.cookie || "" } },
        })

        if (!data.me) {
          return {
            redirect: {
              destination: "/login",
            },
          }
        }

        return {
          props: {
            ...gsspData.props,
            me: data.me,
          },
        }
    } catch (_) {
        return {
          redirect: {
            destination: "/login",
          },
        }
    }
  }
}

export function withoutAuth(gssp: any) {
  return async (context: any) => {
    const gsspData = await gssp(context)

    if (gsspData.redirect) {
      return {
        redirect: {
          ...gsspData.redirect,
        },
      }
    }

    try {
        const { data } = await client.query({
          query: ME,
          fetchPolicy: "no-cache",
          context: { headers: { cookie: context.req.headers.cookie || "" } },
        })

        if (data.me) {
          return {
            redirect: {
              destination: "/",
            },
          }
        }

        return {
          props: {
            ...gsspData.props,
            me: data.me,
          },
        }
    } catch (_) {}

    return {
      props: {
        ...gsspData.props,
      },
    }
  }
}

