export type MapStop = {
  id: string;
  day_date: string;
  sort_order: number;
  title: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
};

export type RoutePreview = {
  points: number[][];
  distanceMeters: number;
  durationSeconds: number;
  count: number;
};
