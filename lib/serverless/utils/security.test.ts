import { hashPassword, verifyPassword } from "./security"

describe("password security", () => {
  it("stores a salted password hash and verifies only the original password", async () => {
    const password = "a-long-test-password"
    const firstHash = await hashPassword(password)
    const secondHash = await hashPassword(password)

    expect(firstHash).toMatch(/^scrypt\$/)
    expect(firstHash).not.toContain(password)
    expect(firstHash).not.toEqual(secondHash)
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true)
    await expect(verifyPassword("incorrect-password", firstHash)).resolves.toBe(false)
  })

  it("supports one-time migration of a matching legacy plaintext password", async () => {
    await expect(verifyPassword("legacy-password", "legacy-password")).resolves.toBe(true)
    await expect(verifyPassword("wrong-password", "legacy-password")).resolves.toBe(false)
  })
})

