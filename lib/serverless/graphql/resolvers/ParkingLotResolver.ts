import {
  Resolver,
  Mutation,
  Arg,
  Authorized,
  Ctx,
  Query,
  Field,
  ObjectType,
} from "type-graphql"
import { Equal, MoreThanOrEqual } from "typeorm"

import { ParkingType } from "../../../../src/types"
import { EntryPoint } from "../../entities/EntryPoint"
import { EntryPointToParkingSlotDistance } from "../../entities/EntryPointToParkingSlotDistance"
import { ParkingLot } from "../../entities/ParkingLot"
import { ParkingSlot } from "../../entities/ParkingSlot"
import { Vehicle } from "../../entities/Vehicle"
import { getHoursDiff, getRate } from "../../utils/rate"
import type { IContext } from "../../utils/types"
import { ParkArgs, ParkingLotArgs, UnparkArgs } from "../args/ParkingLotArgs"

@ObjectType()
class ParkResponse {
  @Field({ nullable: true })
  errorMessage?: string

  @Field(() => Vehicle, { nullable: true })
  vehicle?: Vehicle | undefined | null
}

@Resolver()
export class ParkingLotResolver {
  randomInteger = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min

  @Mutation(() => ParkingLot, { nullable: true })
  @Authorized()
  async createParkingLot(
    @Arg("args") { sCount, mCount, lCount, entryPointsCount }: ParkingLotArgs,
    @Ctx() context: IContext
  ): Promise<ParkingLot> {
    const parkingLot: ParkingLot = await ParkingLot.create({
      entryPointsCount,
    }).save()
    const entryPoints: EntryPoint[] = []
    let parkingSlot: any

    // Create parking Entry Points based on count of entry points
    for (let [idx, _] of Array(entryPointsCount).entries()) {
      let entryPoint = await EntryPoint.create({
        name: `Entry Point ${String.fromCharCode(97 + idx).toUpperCase()}`,
        parkingLot,
      }).save()
      entryPoints.push(entryPoint)
    }

    // Create Parking Slots, based on count of each size
    for (let _ of Array(sCount)) {
      parkingSlot = await ParkingSlot.create({
        type: ParkingType.SP,
        parkingLot,
      }).save()

      for (let entryPoint of entryPoints) {
        await EntryPointToParkingSlotDistance.create({
          parkingSlot,
          entryPoint,
          distance: this.randomInteger(1, 500),
        }).save()
      }
    }

    for (let _ of Array(mCount)) {
      parkingSlot = await ParkingSlot.create({
        type: ParkingType.MP,
        parkingLot,
      }).save()

      for (let entryPoint of entryPoints) {
        await EntryPointToParkingSlotDistance.create({
          parkingSlot,
          entryPoint,
          distance: this.randomInteger(1, 500),
        }).save()
      }
    }

    for (let _ of Array(lCount)) {
      parkingSlot = await ParkingSlot.create({
        type: ParkingType.LP,
        parkingLot,
      }).save()

      for (let entryPoint of entryPoints) {
        await EntryPointToParkingSlotDistance.create({
          parkingSlot,
          entryPoint,
          distance: this.randomInteger(1, 500),
        }).save()
      }
    }

    return parkingLot
  }

  @Mutation(() => ParkResponse)
  @Authorized()
  async park(
    @Arg("args")
    { parkingLotId, entryPointId, plateNumber, size, checkInTime }: ParkArgs
  ): Promise<ParkResponse> {
    // Search for the nearest compatible parking space from entrance
    let parkingSlot = await ParkingSlot.findOne({
      where: {
        isAvailable: true,
        parkingLot: { id: parkingLotId },
        entryPointDistances: { entryPoint: { id: entryPointId } },
        type: MoreThanOrEqual(size),
      },
      relations: {
        vehicle: true,
        entryPointDistances: { entryPoint: true },
        parkingLot: true,
      },
      order: {
        entryPointDistances: { distance: "ASC" },
        type: "ASC",
      },
    })

    // if (!parkingSlot) {
    //   parkingSlot = await ParkingSlot.findOne({
    //     where: {
    //       isAvailable: true,
    //       parkingLot: { id: parkingLotId },
    //       entryPointDistances: { entryPoint: { id: entryPointId } },
    //       type: MoreThanOrEqual(size),
    //     },
    //     relations: {
    //       vehicle: true,
    //       entryPointDistances: { entryPoint: true },
    //       parkingLot: true,
    //     },
    //     order: {
    //       entryPointDistances: { distance: "ASC" },
    //       type: "ASC",
    //     },
    //   })
    // }

    if (parkingSlot) {
      let vehicle = await Vehicle.findOne({
        where: { plateNumber },
        relations: { parkingSlot: true, lastParkingLot: true },
      })

      let entryPoint = await EntryPoint.findOne({
        where: { id: entryPointId },
      })

      if (!vehicle) {
        // If vehicle does not yet exist, create a new vehicle
        vehicle = await Vehicle.create({
          plateNumber,
          size,
          checkInTime: checkInTime ? checkInTime : new Date(),
          lastCheckInTime: checkInTime ? checkInTime : new Date(),
          parkingSlot,
          lastEntryPoint: entryPoint,
          lastParkingLot: parkingSlot.parkingLot,
        }).save()

        await ParkingSlot.update({ id: parkingSlot.id }, { isAvailable: false })
      } else {
        if (!vehicle.parkingSlot) {
          if (parkingLotId !== vehicle?.lastParkingLot?.id) {
            // If vehicle parked to a new parking lot, reset values of vehicle
            await Vehicle.update(
              { id: vehicle.id },
              {
                checkInTime: checkInTime ? checkInTime : new Date(),
                lastCheckInTime: checkInTime ? checkInTime : new Date(),
                checkOutTime: null,
                lastEntryPoint: entryPoint,
                isContinuousRate: false,
                lastParkingLot: parkingSlot.parkingLot,
                totalContinuousBill: 0,
                hoursParked: 0,
              }
            )
            vehicle = await Vehicle.findOneOrFail({
              where: { plateNumber },
              relations: { parkingSlot: true, lastParkingLot: true },
            })
          }

          // If vehicle exists, update existing vehicle's checkInTime depending if the continuous rate applies
          const newCheckInTime: Date = new Date()
          const isContinuousRate: boolean = vehicle._isContinuousRate(
            checkInTime ? checkInTime : newCheckInTime
          )
          const finalCheckInTime: Date | undefined = isContinuousRate
            ? vehicle.checkInTime
            : checkInTime
            ? checkInTime
            : new Date()

          if (checkInTime && vehicle.checkOutTime) {
            if (checkInTime < vehicle.checkOutTime) {
              return {
                errorMessage:
                  "Check in time should be later than previous check out time.",
              }
            }
          }

          await Vehicle.update(
            { id: vehicle.id },
            {
              checkInTime: finalCheckInTime,
              lastCheckInTime: checkInTime ? checkInTime : new Date(),
              lastEntryPoint: entryPoint,
              isContinuousRate,
            }
          )
          if (!isContinuousRate) {
            await Vehicle.update(
              { id: vehicle.id },
              {
                totalContinuousBill: 0,
                hoursParked: 0,
              }
            )
          }
          await ParkingSlot.update(
            { id: parkingSlot.id },
            { vehicle, isAvailable: false }
          )
        } else {
          return {
            errorMessage: "A vehicle is still parked.",
          }
        }
      }

      vehicle = await Vehicle.findOne({
        where: { id: vehicle.id },
        relations: { parkingSlot: true, lastEntryPoint: true },
      })

      return { vehicle }
    } else {
      return { errorMessage: "No available parking slot." }
    }
  }

  @Mutation(() => ParkResponse)
  @Authorized()
  async unpark(
    @Arg("args")
    { parkingSlotId, checkOutTime }: UnparkArgs
  ): Promise<ParkResponse> {
    const newCheckOutTime = checkOutTime ? checkOutTime : new Date()

    let vehicle = await Vehicle.findOne({
      where: { parkingSlot: { id: parkingSlotId } },
      relations: { parkingSlot: true },
    })

    if (vehicle) {
      if (newCheckOutTime && vehicle.lastCheckInTime) {
        if (newCheckOutTime < vehicle.lastCheckInTime) {
          return {
            errorMessage:
              "Check out time should be later than previous check in time.",
          }
        }
      }

      const totalBill = await vehicle.totalBill(newCheckOutTime)
      let totalContinuousBill =
        parseFloat(vehicle.totalContinuousBill.toString()) +
        parseFloat(totalBill.toString())

      const hoursParked = getHoursDiff(
        vehicle.lastCheckInTime ? vehicle.lastCheckInTime : new Date(),
        newCheckOutTime,
        false,
        false
      )

      await Vehicle.update(
        { id: vehicle.id },
        {
          checkOutTime: newCheckOutTime,
          lastBillPaid: totalBill,
          totalContinuousBill,
          hoursParked:
            parseFloat(vehicle.hoursParked.toString()) +
            parseFloat(hoursParked.toString()),
        }
      )
      await ParkingSlot.update(
        { id: parkingSlotId },
        { vehicle: null, isAvailable: true }
      )
    } else {
      return { errorMessage: "There is no vehicle parked." }
    }

    vehicle = await Vehicle.findOne({
      where: { id: vehicle.id },
      relations: { parkingSlot: true, lastEntryPoint: true },
    })

    return { vehicle }
  }

  @Query(() => [ParkingLot], { nullable: true })
  @Authorized()
  async getParkingLots(): Promise<ParkingLot[] | null> {
    return await ParkingLot.find({
      relations: {
        parkingSlots: {
          vehicle: { lastEntryPoint: true },
          entryPointDistances: { entryPoint: true },
        },
      },
      order: {
        entryPoints: { name: "ASC" },
        id: "ASC",
      },
    })
  }

  @Query(() => ParkingLot, { nullable: true })
  @Authorized()
  async getParkingLotById(@Arg("id") id: number): Promise<ParkingLot | null> {
    const parkingLot = await ParkingLot.findOne({
      where: { id },
      relations: {
        entryPoints: true,
        parkingSlots: {
          vehicle: { lastEntryPoint: true },
          entryPointDistances: { entryPoint: true },
        },
      },
      order: {
        entryPoints: { name: "ASC" },
        parkingSlots: {
          id: "ASC",
          entryPointDistances: { entryPoint: { name: "ASC" } },
        },
      },
    })
    return parkingLot
  }

  @Query(() => [EntryPoint], { nullable: true })
  @Authorized()
  async getEntryPointsById(
    @Arg("id") id: number
  ): Promise<EntryPoint[] | null> {
    const entryPoints = await EntryPoint.find({
      where: { parkingLot: { id } },
    })

    return entryPoints
  }
}

