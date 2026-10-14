import { describe, expect, it } from "vitest"
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  signInSchema,
  signUpSchema,
} from "./auth-schemas"

function messages(result: {
  success: boolean
  error?: { issues: { message: string }[] }
}) {
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe("signUpSchema", () => {
  const valid = { name: "Ada", email: "ada@example.com", password: "password1" }

  it("normalizes name and email", () => {
    expect(
      signUpSchema.parse({
        ...valid,
        name: "  Ada  ",
        email: " Ada@Example.COM ",
      })
    ).toEqual({ ...valid, name: "Ada", email: "ada@example.com" })
  })

  it("rejects blank and overlong names", () => {
    expect(messages(signUpSchema.safeParse({ ...valid, name: "   " }))).toEqual(
      ["Enter your name."]
    )
    expect(
      signUpSchema.safeParse({
        ...valid,
        name: "a".repeat(NAME_MAX_LENGTH + 1),
      }).success
    ).toBe(false)
  })

  it("rejects invalid emails", () => {
    expect(
      messages(signUpSchema.safeParse({ ...valid, email: "nope" }))
    ).toEqual(["Enter a valid email address."])
  })

  it("enforces password length bounds", () => {
    expect(
      signUpSchema.safeParse({
        ...valid,
        password: "a".repeat(PASSWORD_MIN_LENGTH - 1),
      }).success
    ).toBe(false)
    expect(
      signUpSchema.safeParse({
        ...valid,
        password: "a".repeat(PASSWORD_MAX_LENGTH + 1),
      }).success
    ).toBe(false)
    expect(
      signUpSchema.safeParse({
        ...valid,
        password: "a".repeat(PASSWORD_MIN_LENGTH),
      }).success
    ).toBe(true)
  })
})

describe("signInSchema", () => {
  it("normalizes the email and requires a password", () => {
    expect(
      signInSchema.parse({ email: " Ada@Example.com ", password: "x" })
    ).toEqual({ email: "ada@example.com", password: "x" })
    expect(
      messages(
        signInSchema.safeParse({ email: "ada@example.com", password: "" })
      )
    ).toEqual(["Enter your password."])
  })
})
