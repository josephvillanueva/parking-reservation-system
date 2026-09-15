import { DataSource } from "typeorm"
import { EntryPoint } from "../entities/EntryPoint"
import { EntryPointToParkingSlotDistance } from "../entities/EntryPointToParkingSlotDistance"
import { ParkingLot } from "../entities/ParkingLot"
import { ParkingSlot } from "../entities/ParkingSlot"
import { User } from "../entities/User"
import { Vehicle } from "../entities/Vehicle"

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: 5432,
  entities: [
    User,
    EntryPoint,
    ParkingSlot,
    Vehicle,
    ParkingLot,
    EntryPointToParkingSlotDistance,
  ],
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV === "development",
})

