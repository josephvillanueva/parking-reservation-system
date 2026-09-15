import React from "react"
import { MoonIcon, SunIcon } from "@chakra-ui/icons"
import {
  Box,
  Heading,
  Flex,
  Button,
  useColorMode,
  Link,
} from "@chakra-ui/react"
import { useRouter, withRouter } from "next/router"
import NextLink from "next/link"
import AddParkingLotModal from "./AddParkingLotModal"
import ParkModal from "./ParkModal"
import { useMutation } from "@apollo/client"
import { LOGOUT } from "../mutations"

const NavBarContent: React.FC<any> = ({
  fetchParkingLots,
  fetchParkingSlots,
  me,
}) => {
  const { colorMode, toggleColorMode } = useColorMode()
  const router = useRouter()
  const [logout] = useMutation(LOGOUT)

  const renderNavButtons = () => {
    const navButtons: React.ReactElement<any>[] = []

    if (router.pathname === "/") {
      navButtons.push(
        <AddParkingLotModal fetchParkingLots={fetchParkingLots} key={0} />
      )
    } else if (router.pathname.includes("parking-lot")) {
      navButtons.push(
        <ParkModal fetchParkingSlots={fetchParkingSlots} key={1} />
      )
    }

    navButtons.push(
      <Button
        onClick={toggleColorMode}
        size="md"
        ml={2}
        mt={{ base: me ? 2 : 0, lg: 0 }}
        key={2}
      >
        {colorMode === "light" ? <MoonIcon /> : <SunIcon />}
      </Button>
    )

    if (me) {
      const onLogout = async () => {
        await logout()
        await router.push("/login")
      }

      navButtons.push(
        <Button
          _hover={{ opacity: 0.8 }}
          bg="red.400"
          color="white"
          size="md"
          ml={2}
          mt={{ base: 2, lg: 0 }}
          onClick={onLogout}
          key={3}
        >
          Logout
        </Button>
      )
    }

    return navButtons
  }

  return (
    <>
      <Box>
        <NextLink href="/">
          <Link _hover={{ fontStyle: "", opacity: 0.7 }} transition="0.4s">
            <Heading size="lg">oo parking!</Heading>
          </Link>
        </NextLink>
      </Box>
      <Flex direction={{ base: "column", lg: "row" }}>
        {renderNavButtons()}
      </Flex>
    </>
  )
}

export default withRouter(NavBarContent)

