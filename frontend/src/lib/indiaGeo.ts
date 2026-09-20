/** Real Indian flood-corridor frames for satellite overlay. Leaflet uses [lat, lng]. */

export type LatLng = [number, number];

export interface CityGeo {
  id: string;
  name: string;
  river: string;
  event: string;
  center: LatLng;
  zoom: number;
  bbox: { north: number; south: number; west: number; east: number };
  rivers: { name: string; coords: LatLng[] }[];
  lakes: { name: string; coords: LatLng[] }[];
}

const CITIES: Record<string, CityGeo> = {
  bengaluru: {
    id: "bengaluru",
    name: "Bengaluru",
    river: "Koramangala–Challaghatta valley · Bellandur",
    event: "Monsoon valley overflow into lakes and dense wards",
    center: [12.942, 77.668],
    zoom: 13,
    bbox: { north: 12.972, south: 12.918, west: 77.608, east: 77.742 },
    rivers: [
      {
        name: "K&C storm valley",
        coords: [
          [12.968, 77.618],
          [12.962, 77.628],
          [12.954, 77.638],
          [12.946, 77.648],
          [12.94, 77.658],
          [12.936, 77.666],
          [12.934, 77.674],
          [12.938, 77.692],
          [12.946, 77.712],
          [12.952, 77.728],
          [12.956, 77.738],
        ],
      },
    ],
    lakes: [
      {
        name: "Bellandur Lake",
        coords: [
          [12.946, 77.655],
          [12.943, 77.67],
          [12.936, 77.678],
          [12.928, 77.676],
          [12.926, 77.664],
          [12.93, 77.652],
          [12.938, 77.65],
        ],
      },
      {
        name: "Varthur Lake",
        coords: [
          [12.96, 77.728],
          [12.958, 77.742],
          [12.952, 77.744],
          [12.948, 77.734],
          [12.952, 77.724],
        ],
      },
      {
        name: "Agara Lake",
        coords: [
          [12.928, 77.638],
          [12.927, 77.646],
          [12.922, 77.646],
          [12.922, 77.638],
        ],
      },
    ],
  },
  mumbai: {
    id: "mumbai",
    name: "Mumbai",
    river: "Mithi River · Mahim Creek",
    event: "River overtopping through Bandra–Kurla and Mahim",
    center: [19.082, 72.876],
    zoom: 13,
    bbox: { north: 19.138, south: 19.038, west: 72.832, east: 72.918 },
    rivers: [
      {
        name: "Mithi River",
        coords: [
          [19.132, 72.908],
          [19.122, 72.9],
          [19.11, 72.892],
          [19.098, 72.884],
          [19.086, 72.876],
          [19.074, 72.868],
          [19.062, 72.856],
          [19.052, 72.846],
          [19.044, 72.838],
        ],
      },
    ],
    lakes: [
      {
        name: "Powai Lake",
        coords: [
          [19.136, 72.9],
          [19.132, 72.912],
          [19.122, 72.914],
          [19.118, 72.902],
          [19.126, 72.896],
        ],
      },
    ],
  },
  chennai: {
    id: "chennai",
    name: "Chennai",
    river: "Adyar River",
    event: "Coastal-plain river burst toward the mouth",
    center: [13.01, 80.248],
    zoom: 13,
    bbox: { north: 13.038, south: 12.988, west: 80.198, east: 80.286 },
    rivers: [
      {
        name: "Adyar River",
        coords: [
          [13.006, 80.204],
          [13.004, 80.218],
          [13.006, 80.232],
          [13.01, 80.246],
          [13.014, 80.258],
          [13.016, 80.27],
          [13.014, 80.28],
        ],
      },
      {
        name: "Buckingham Canal",
        coords: [
          [13.034, 80.268],
          [13.024, 80.27],
          [13.014, 80.272],
          [13.004, 80.274],
          [12.994, 80.276],
        ],
      },
    ],
    lakes: [],
  },
  delhi: {
    id: "delhi",
    name: "Delhi",
    river: "Yamuna",
    event: "Yamuna rise across the eastern floodplain",
    center: [28.625, 77.262],
    zoom: 12,
    bbox: { north: 28.698, south: 28.548, west: 77.208, east: 77.328 },
    rivers: [
      {
        name: "Yamuna",
        coords: [
          [28.694, 77.228],
          [28.678, 77.234],
          [28.662, 77.242],
          [28.644, 77.25],
          [28.626, 77.258],
          [28.608, 77.268],
          [28.588, 77.282],
          [28.57, 77.296],
          [28.554, 77.312],
        ],
      },
    ],
    lakes: [],
  },
  hyderabad: {
    id: "hyderabad",
    name: "Hyderabad",
    river: "Musi · Hussain Sagar",
    event: "Lake and Musi corridor spilling into sealed catchments",
    center: [17.4, 78.48],
    zoom: 13,
    bbox: { north: 17.442, south: 17.352, west: 78.428, east: 78.528 },
    rivers: [
      {
        name: "Musi River",
        coords: [
          [17.392, 78.434],
          [17.386, 78.452],
          [17.38, 78.47],
          [17.374, 78.49],
          [17.368, 78.508],
          [17.362, 78.522],
        ],
      },
    ],
    lakes: [
      {
        name: "Hussain Sagar",
        coords: [
          [17.432, 78.468],
          [17.428, 78.482],
          [17.418, 78.486],
          [17.412, 78.476],
          [17.418, 78.464],
          [17.426, 78.462],
        ],
      },
    ],
  },
  kolkata: {
    id: "kolkata",
    name: "Kolkata",
    river: "Hooghly",
    event: "Tidal river and canal wards under monsoon loading",
    center: [22.565, 88.35],
    zoom: 13,
    bbox: { north: 22.605, south: 22.525, west: 88.305, east: 88.405 },
    rivers: [
      {
        name: "Hooghly River",
        coords: [
          [22.602, 88.348],
          [22.588, 88.344],
          [22.574, 88.34],
          [22.56, 88.338],
          [22.546, 88.336],
          [22.532, 88.334],
        ],
      },
    ],
    lakes: [],
  },
  ahmedabad: {
    id: "ahmedabad",
    name: "Ahmedabad",
    river: "Sabarmati",
    event: "River-adjacent wards during a monsoon pulse",
    center: [23.04, 72.572],
    zoom: 13,
    bbox: { north: 23.082, south: 23.002, west: 72.548, east: 72.618 },
    rivers: [
      {
        name: "Sabarmati",
        coords: [
          [23.078, 72.582],
          [23.064, 72.578],
          [23.05, 72.574],
          [23.036, 72.57],
          [23.022, 72.568],
          [23.008, 72.566],
        ],
      },
    ],
    lakes: [],
  },
  pune: {
    id: "pune",
    name: "Pune",
    river: "Mula–Mutha",
    event: "Basin rivers rising through the city nallahs",
    center: [18.528, 73.856],
    zoom: 13,
    bbox: { north: 18.562, south: 18.492, west: 73.812, east: 73.902 },
    rivers: [
      {
        name: "Mula",
        coords: [
          [18.558, 73.816],
          [18.552, 73.83],
          [18.546, 73.844],
          [18.538, 73.854],
          [18.53, 73.858],
        ],
      },
      {
        name: "Mutha",
        coords: [
          [18.508, 73.84],
          [18.514, 73.848],
          [18.522, 73.854],
          [18.53, 73.858],
          [18.536, 73.868],
          [18.54, 73.882],
        ],
      },
    ],
    lakes: [],
  },
  guwahati: {
    id: "guwahati",
    name: "Guwahati",
    river: "Brahmaputra",
    event: "Hill-to-plain runoff meeting the Brahmaputra bank",
    center: [26.168, 91.75],
    zoom: 13,
    bbox: { north: 26.198, south: 26.132, west: 91.698, east: 91.818 },
    rivers: [
      {
        name: "Brahmaputra",
        coords: [
          [26.188, 91.702],
          [26.186, 91.722],
          [26.182, 91.742],
          [26.178, 91.762],
          [26.174, 91.782],
          [26.17, 91.802],
          [26.166, 91.816],
        ],
      },
    ],
    lakes: [],
  },
  custom: {
    id: "custom",
    name: "Custom Indian City",
    river: "Synthetic corridor on real terrain",
    event: "User-configured twin draped on Indian satellite ground",
    center: [12.942, 77.668],
    zoom: 13,
    bbox: { north: 12.972, south: 12.918, west: 77.608, east: 77.742 },
    rivers: [
      {
        name: "Valley drain",
        coords: [
          [12.968, 77.618],
          [12.94, 77.658],
          [12.956, 77.738],
        ],
      },
    ],
    lakes: [],
  },
};

export function cityGeo(id: string): CityGeo {
  return CITIES[id] ?? CITIES.bengaluru;
}

export function cellCenter(geo: CityGeo, row: number, col: number, rows = 12, cols = 12): LatLng {
  const { north, south, west, east } = geo.bbox;
  const lat = north - ((row + 0.5) / rows) * (north - south);
  const lng = west + ((col + 0.5) / cols) * (east - west);
  return [lat, lng];
}

export function latLngToCell(geo: CityGeo, lat: number, lng: number, rows = 12, cols = 12): { row: number; col: number } | null {
  const { north, south, west, east } = geo.bbox;
  const u = (north - lat) / (north - south);
  const v = (lng - west) / (east - west);
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { row: Math.min(rows - 1, Math.floor(u * rows)), col: Math.min(cols - 1, Math.floor(v * cols)) };
}
