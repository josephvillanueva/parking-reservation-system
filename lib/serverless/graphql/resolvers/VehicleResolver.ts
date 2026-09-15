import { Resolver, Arg, Authorized, Query } from "type-graphql"
import { Vehicle } from "../../entities/Vehicle"
import { getRate } from "../../utils/rate"

@Resolver()
export class VehicleResolver {
  @Query(() => [Vehicle], { nullable: true })
  @Authorized()
  async getVehicles(): Promise<Vehicle[] | null> {
    return await Vehicle.find({
      relations: {
        parkingSlot: true,
      },
    })
  }

  @Query(() => Vehicle, { nullable: true })
  @Authorized()
  async getVehicleById(@Arg("id") id: number): Promise<Vehicle | null> {
    const vehicle = await Vehicle.findOne({
      where: { id },
      relations: {
        parkingSlot: true,
      },
    })
    return vehicle
  }

  @Query(() => Vehicle, { nullable: true })
  @Authorized()
  async getVehicleByPlateNumber(
    @Arg("plateNumber") plateNumber: string
  ): Promise<Vehicle | null> {
    const vehicle = await Vehicle.findOne({
      where: { plateNumber },
      relations: {
        parkingSlot: true,
      },
    })
    return vehicle
  }

  @Query(() => Number, { nullable: true })
  @Authorized()
  async getFeeToPay(
    @Arg("id") id: number,
    @Arg("checkOutTime") checkOutTime: Date
  ): Promise<number | null> {
    const vehicle = await Vehicle.findOneOrFail({
      where: { id },
      relations: {
        parkingSlot: true,
      },
    })

    const totalBill = await vehicle.totalBill(checkOutTime)

    return totalBill
  }
}

