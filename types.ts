
export type Category = 'Pressure' | 'Temperature' | 'Flow' | 'Volume' | 'Weight' | 'Length' | 'IdealGas' | 'WireSize' | 'PipeSchedules' | 'Flanges' | 'Torque' | 'Electrical' | 'Tables' | 'Constants' | 'Steam' | 'PSV' | 'Materials' | 'AI';

export interface TorqueEntry {
  boltSize: string;
  torques: {
    [frictionFactor: string]: number; // ft-lb
  };
}

export interface FlangeEntry {
  nps: string;
  class: number;
  studSize: string;
  studQty: number;
  nutSize: string;
}

export interface PipeScheduleEntry {
  nps: string;
  od: number; // inches
  schedules: {
    [key: string]: {
      wall: number; // inches
      id: number; // inches
    };
  };
}

export interface TubingEntry {
  od: string;
  wall: string;
  id: number; // inches
}

export interface Unit {
  id: string;
  name: string;
  factor: number;
  offset?: number;
}

export interface WireTableEntry {
  awg: string;
  area: number;
  ampacity: number;
  resistance: number;
}

export interface PhysicalConstant {
  name: string;
  value: string;
  unit: string;
  description: string;
}

export interface SteamTableEntry {
  pressurePSIG: number;
  tempF: number;
  latentHeatBTU: number;
  totalEnthalpyBTU: number;
}

export interface MaterialProperty {
  name: string;
  density: { si: number; imp: number }; // kg/m3, lb/ft3
  modulus: { si: number; imp: number }; // GPa, Mpsi
  expansion: { si: number; imp: number }; // um/m-C, uin/in-F
  category: 'Metal' | 'Plastic' | 'Other';
}

export interface CalculationLog {
  id: string;
  timestamp: string;
  module: string;
  input: string;
  result: string;
}
