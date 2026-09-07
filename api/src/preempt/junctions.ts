/**
 * Junction inventory.
 *
 * Sample data along the 100 Feet Road / CMH Road corridor in Indiranagar,
 * chosen because it passes the incident coordinate the rest of the system
 * already uses for its simulations. Coordinates are approximate and are here to
 * make the planner and the bench demo exercise realistic geometry.
 *
 * This is STAND-IN data. Real junction ids, positions, approach numbers and
 * controller models have to come from Bengaluru Traffic Police. Nothing here
 * should be presented as a survey.
 */

export type ControllerKind = 'dry-contact' | 'ntcip-1202' | 'loopback';

export type Junction = {
  /** uint16 on air. Not a CS-xxx-xxx string: that would cost 10 bytes a frame. */
  id: number;
  name: string;
  lat: number;
  lng: number;
  /** Approach/phase ids this junction can be asked for. 0 = default preempt input. */
  approaches: number[];
  controllerKind: ControllerKind;
  /** Set at commissioning from the measured link budget, never adapted at runtime. */
  spreadingFactor: 7 | 8 | 9 | 10 | 11 | 12;
  txPowerDbm: number;
};

export const JUNCTIONS: readonly Junction[] = [
  { id: 11, name: 'Indiranagar 100ft / CMH Road', lat: 12.9784, lng: 77.6408, approaches: [0, 2, 4], controllerKind: 'loopback', spreadingFactor: 7, txPowerDbm: 14 },
  { id: 12, name: 'Indiranagar 100ft / 12th Main', lat: 12.9743, lng: 77.6395, approaches: [0, 2], controllerKind: 'loopback', spreadingFactor: 7, txPowerDbm: 14 },
  { id: 13, name: 'Domlur Flyover south', lat: 12.9698, lng: 77.6382, approaches: [0, 2, 4], controllerKind: 'loopback', spreadingFactor: 9, txPowerDbm: 14 },
  { id: 14, name: 'Old Airport Road / HAL', lat: 12.9631, lng: 77.6421, approaches: [0, 2], controllerKind: 'loopback', spreadingFactor: 9, txPowerDbm: 14 },
  { id: 15, name: 'Manipal Hospital approach', lat: 12.9589, lng: 77.6487, approaches: [0], controllerKind: 'loopback', spreadingFactor: 9, txPowerDbm: 14 },
];

export const JUNCTION_IDS: readonly number[] = JUNCTIONS.map((j) => j.id);

const BY_ID = new Map(JUNCTIONS.map((j) => [j.id, j]));

export const junctionById = (id: number): Junction | null => BY_ID.get(id) ?? null;
