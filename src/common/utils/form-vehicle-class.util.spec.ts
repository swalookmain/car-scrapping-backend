import { defaultFormVehicleClass } from './form-vehicle-class.util';
import { VehicleType } from '../enum/vehicleType.enum';
import { FormVehicleClass } from '../enum/formVehicleClass.enum';

describe('defaultFormVehicleClass', () => {
  it('maps vehicle types to FORM-3 classes', () => {
    expect(defaultFormVehicleClass(VehicleType.BIKE)).toBe(FormVehicleClass.L);
    expect(defaultFormVehicleClass(VehicleType.CAR)).toBe(FormVehicleClass.M);
    expect(defaultFormVehicleClass(VehicleType.COMMERCIAL)).toBe(
      FormVehicleClass.N,
    );
    expect(defaultFormVehicleClass('UNKNOWN')).toBe(FormVehicleClass.OTHER);
  });
});
