import { FormVehicleClass } from '../enum/formVehicleClass.enum';
import { VehicleType } from '../enum/vehicleType.enum';

export function defaultFormVehicleClass(
  vehicleType: VehicleType | string,
): FormVehicleClass {
  switch (vehicleType) {
    case VehicleType.BIKE:
      return FormVehicleClass.L;
    case VehicleType.CAR:
      return FormVehicleClass.M;
    case VehicleType.COMMERCIAL:
      return FormVehicleClass.N;
    default:
      return FormVehicleClass.OTHER;
  }
}
