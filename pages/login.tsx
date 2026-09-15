import React from "react"
import { useRouter } from "next/router"
import { Form, Formik } from "formik"
import {
  FormControl,
  Input,
  InputGroup,
  Button,
  InputRightElement,
  FormErrorMessage,
  Flex,
  Box,
} from "@chakra-ui/react"
import NavBar from "../src/components/NavBar"
import { LOGIN } from "../src/mutations"
import { useMutation } from "@apollo/client"
import { toErrorMap, withoutAuth } from "../src/utils"

interface loginProps {}

const Login: React.FC<loginProps> = () => {
  const [show, setShow] = React.useState(false)
  const [login] = useMutation(LOGIN)
  const router = useRouter()

  const validate = (values: any) => {
    const errors: any = {}

    if (!values.username) {
      errors.username = "Required"
    }
    if (!values.password) {
      errors.password = "Required"
    }

    return errors
  }

  return (
    <>
      <NavBar />
      <Flex
        direction="column"
        alignItems="center"
        px={{ base: 12, md: 24, lg: 36 }}
        pb={14}
      >
        <Formik
          initialValues={{ username: "", password: "" }}
          validate={validate}
          onSubmit={async (values, { setErrors, resetForm }) => {
            const response = await login({ variables: values })
            if (response.data?.login.errors) {
              setErrors(toErrorMap(response.data?.login.errors))
            } else if (response.data?.login.user) {
              await router.push("/")
              resetForm()
            }
          }}
        >
          {({ values, handleChange, isSubmitting, errors }) => (
            <Box w={{ base: "80%", md: "60%", lg: "35%" }}>
              <Form>
                <FormControl isInvalid={errors.username !== undefined}>
                  <Input
                    value={values.username}
                    onChange={handleChange}
                    name="username"
                    placeholder="Username"
                  />
                  <FormErrorMessage>{errors.username}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={errors.password !== undefined}>
                  <InputGroup size={"md"} mt={"1rem"}>
                    <Input
                      pr="4.5rem"
                      type={show ? "text" : "password"}
                      value={values.password}
                      onChange={handleChange}
                      name="password"
                      placeholder="Password"
                    />
                    <InputRightElement width="4.5rem">
                      <Button
                        h="1.75rem"
                        size="sm"
                        onClick={() => setShow(!show)}
                      >
                        {show ? "Hide" : "Show"}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>
                <Button
                  type={"submit"}
                  mt={"1rem"}
                  colorScheme="teal"
                  w={"100%"}
                  isLoading={isSubmitting}
                >
                  Login
                </Button>
              </Form>
            </Box>
          )}
        </Formik>
      </Flex>
    </>
  )
}

export const getServerSideProps = withoutAuth((context: any) => {
  return { props: {} }
})

export default Login

