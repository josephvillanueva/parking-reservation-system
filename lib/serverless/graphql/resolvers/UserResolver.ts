/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Arg,
  Authorized,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql"
import { User } from "../../entities/User"
import type { IContext } from "../../utils/types"
import { requireUser } from "../../utils/types"
import { clearSessionCookie, hashPassword, setSessionCookie, verifyPassword } from "../../utils/security"

@ObjectType()
class FieldError {
  @Field()
  field?: string
  @Field()
  message?: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]
  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Mutation(() => User)
  async registerUser(
    @Arg("firstName") firstName: string,
    @Arg("lastName") lastName: string,
    @Arg("username") username: string,
    @Arg("password") password: string,
    @Ctx() context: IContext
  ): Promise<User> {
    if (await User.count() > 0) throw new Error("Registration is closed")
    if (username.length < 3 || username.length > 64) throw new Error("Username must contain 3 to 64 characters")
    if (password.length < 12 || password.length > 128) throw new Error("Password must contain 12 to 128 characters")
    const user = await User.create({
      firstName,
      lastName,
      username,
      password: await hashPassword(password),
    }).save()

    return user
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("username") username: string,
    @Arg("password") password: string,
    @Ctx() context: IContext
  ): Promise<UserResponse> {
    const user = await User.findOne({ where: { username } })

    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "Username does not exist.",
          },
        ],
      }
    }

    if (!(await verifyPassword(password, user.password))) {
      return {
        errors: [
          {
            field: "password",
            message: "Incorrect password.",
          },
        ],
      }
    }

    if (!user.password.startsWith("scrypt$")) {
      user.password = await hashPassword(password)
      await user.save()
    }
    setSessionCookie(context.res, user.userId)
    return { user }
  }

  @Mutation(() => Boolean)
  @Authorized()
  async logout(@Ctx() context: IContext): Promise<boolean> {
    clearSessionCookie(context.req, context.res)
    return true
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() context: IContext): Promise<User | null> {
    if (!context.userId) return null
    return await User.findOne({ where: { userId: context.userId } })
  }

  @Query(() => User)
  @Authorized()
  async getUser(
    @Arg("userId") userId: number,
    @Ctx() context: IContext
  ): Promise<User> {
    const authenticatedUserId = requireUser(context)
    if (authenticatedUserId !== userId) throw new Error("Access denied")
    return await User.findOneOrFail({ where: { userId } })
  }
}

