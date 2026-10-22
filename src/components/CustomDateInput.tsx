import { Input } from "@chakra-ui/react"
import React, { forwardRef } from "react"

const CustomDateInput = forwardRef(({ value, onClick }: any, ref: any) => (
  <Input type="text" ref={ref} required value={value} onClick={onClick} />
))

CustomDateInput.displayName = "CustomDateInput"

export default CustomDateInput
