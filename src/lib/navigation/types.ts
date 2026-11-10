import type { LatLon } from './route-progress';

export type NavigationStop = {
  id: string;
  title: string;
  day_date: string;
  sort_order: number;
  latitude: number | null;
  longitude: number | null;
};

export type NavigationStep = {
  instruction: string;
  position: LatLon;
  type: string;
};

export type NavigationRoute = {
  points: LatLon[];
  steps: NavigationStep[];
  distanceMeters: number;
  durationSeconds: number;
  waypointCount: number;
  usesLiveStart: boolean;
};
