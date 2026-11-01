export enum YardVehicleStatus {
  /** Vehicle details inserted (lead/auction); canonical id exists, not physically in yard yet */
  REGISTERED = 'REGISTERED',
  AWAITING_ARRIVAL = 'AWAITING_ARRIVAL',
  GATE_IN = 'GATE_IN',
  PARKED = 'PARKED',
  DISMANTLING_IN_PROGRESS = 'DISMANTLING_IN_PROGRESS',
  DISMANTLED = 'DISMANTLED',
  EXITED = 'EXITED',
}
