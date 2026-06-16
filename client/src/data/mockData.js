export const EV_STATIONS = [
  {
    id: "st-001",
    name: "Bhutan Post Corporation Parking",
    location: {
      lat: 27.473575,
      lng: 89.639074,
      address: "4 Chang Lam -III, Thimphu",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "available", price: "Nu 15/kWh" },
      { id: "c2", type: "CHAdeMO", power: "50kW", status: "occupied", price: "Nu 15/kWh" },
      { id: "c3", type: "Type 2", power: "22kW", status: "available", price: "Nu 10/kWh" }
    ],
    rating: 4.8,
    amenities: ["Restroom", "Cafe", "WiFi"],
    lastUpdated: Date.now()
  },
  {
    id: "st-002",
    name: "Paro Airport EV Hub",
    location: {
      lat: 27.385455,
      lng: 89.424600,
      address: "Paro International Airport",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "120kW", status: "available", price: "Nu 20/kWh" },
      { id: "c2", type: "CCS2", power: "120kW", status: "available", price: "Nu 20/kWh" },
    ],
    rating: 4.9,
    amenities: ["Shopping", "Restroom", "Restaurant"],
    lastUpdated: Date.now()
  },
  {
    id: "st-003",
    name: "Punakha Dzong Eco Charger",
    location: {
      lat: 27.582234,
      lng: 89.864321,
      address: "Punakha Dzong Parking",
    },
    status: "occupied",
    connectors: [
      { id: "c1", type: "Type 2", power: "22kW", status: "occupied", price: "Nu 12/kWh" },
      { id: "c2", type: "Type 2", power: "22kW", status: "occupied", price: "Nu 12/kWh" }
    ],
    rating: 4.5,
    amenities: ["Restroom", "Sightseeing"],
    lastUpdated: Date.now()
  },
  {
    id: "st-004",
    name: "Phuentsholing Border Charger",
    location: {
      lat: 26.861111,
      lng: 89.380556,
      address: "Phuentsholing Main Gate",
    },
    status: "offline",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "offline", price: "Nu 15/kWh" },
    ],
    rating: 3.5,
    amenities: ["Shopping", "Restroom"],
    lastUpdated: Date.now()
  },
  {
    id: "st-005",
    name: "Bumthang Valley Charging",
    location: {
      lat: 27.549212,
      lng: 90.744102,
      address: "Jakar Town, Bumthang",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "available", price: "Nu 18/kWh" },
      { id: "c2", type: "Type 2", power: "22kW", status: "available", price: "Nu 15/kWh" }
    ],
    rating: 4.7,
    amenities: ["Cafe", "Sightseeing"],
    lastUpdated: Date.now()
  },
  {
    id: "st-006",
    name: "Wangdue Phodrang Station",
    location: {
      lat: 27.486203,
      lng: 89.902111,
      address: "Wangdue Main Road",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "available", price: "Nu 16/kWh" },
      { id: "c2", type: "Type 2", power: "22kW", status: "occupied", price: "Nu 11/kWh" }
    ],
    rating: 4.3,
    amenities: ["Restroom", "Restaurant"],
    lastUpdated: Date.now()
  },
  {
    id: "st-007",
    name: "Trongsa Dzong Hub",
    location: {
      lat: 27.500201,
      lng: 90.508103,
      address: "Trongsa Dzong Parking",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "Type 2", power: "22kW", status: "available", price: "Nu 14/kWh" },
    ],
    rating: 4.6,
    amenities: ["Sightseeing", "Cafe"],
    lastUpdated: Date.now()
  },
  {
    id: "st-008",
    name: "Mongar Town Station",
    location: {
      lat: 27.274705,
      lng: 91.239602,
      address: "Mongar Main Market",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "available", price: "Nu 17/kWh" },
    ],
    rating: 4.2,
    amenities: ["Market", "WiFi"],
    lastUpdated: Date.now()
  },
  {
    id: "st-009",
    name: "Trashigang District Hub",
    location: {
      lat: 27.333104,
      lng: 91.554201,
      address: "Trashigang Town Center",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "available", price: "Nu 18/kWh" },
    ],
    rating: 4.4,
    amenities: ["Restroom", "Cafe"],
    lastUpdated: Date.now()
  },
  {
    id: "st-010",
    name: "Samdrup Jongkhar Center",
    location: {
      lat: 26.793201,
      lng: 91.503603,
      address: "S/Jongkhar Bus Terminal",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "available", price: "Nu 15/kWh" },
    ],
    rating: 4.1,
    amenities: ["Restroom", "Shopping"],
    lastUpdated: Date.now()
  },
  {
    id: "st-011",
    name: "Gelephu City Hub",
    location: {
      lat: 26.870602,
      lng: 90.485601,
      address: "Gelephu Main Plaza",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "CCS2", power: "50kW", status: "available", price: "Nu 14/kWh" },
    ],
    rating: 4.5,
    amenities: ["Market", "WiFi"],
    lastUpdated: Date.now()
  },
  {
    id: "st-012",
    name: "Haa Valley Charging",
    location: {
      lat: 27.386204,
      lng: 89.277601,
      address: "Haa Town Square",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "Type 2", power: "22kW", status: "available", price: "Nu 12/kWh" },
    ],
    rating: 4.7,
    amenities: ["Sightseeing", "WiFi"],
    lastUpdated: Date.now()
  },
  {
    id: "st-013",
    name: "Samtse Border Hub",
    location: {
      lat: 26.899003,
      lng: 89.099502,
      address: "Samtse Main Gate",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "Type 2", power: "22kW", status: "available", price: "Nu 11/kWh" },
    ],
    rating: 4.0,
    amenities: ["Shopping", "Restroom"],
    lastUpdated: Date.now()
  },
  {
    id: "st-014",
    name: "Solar EV Charging",
    location: {
      lat: 26.86049,
      lng: 91.46423,
      address: "Electrical Department, JNEC Campus, Dewathang",
    },
    status: "available",
    connectors: [
      { id: "c1", type: "Type 2", power: "22kW", status: "available", price: "Nu 12/kWh" },
      { id: "c2", type: "Type 2", power: "22kW", status: "available", price: "Nu 12/kWh" }
    ],
    rating: 4.8,
    amenities: ["Restroom", "WiFi", "Library"],
    lastUpdated: Date.now()
  }
];

export const MOCK_USER = {
  id: "u-123",
  name: "Karma Wangchuk",
  email: "karma.wangchuk@example.bt",
  phone: "+975 17 12 34 56",
  vehicle: "Nissan Leaf",
  credits: 1500,
  history: [
    {
      id: "h-001",
      date: "2026-05-10T14:30:00Z",
      station: "Bhutan Post Corporation Parking",
      energy: "15 kWh",
      cost: "Nu 225",
      duration: "45 mins"
    },
    {
      id: "h-002",
      date: "2026-05-08T09:15:00Z",
      station: "Paro Airport EV Hub",
      energy: "30 kWh",
      cost: "Nu 600",
      duration: "1h 10m"
    },
    {
      id: "h-003",
      date: "2026-05-05T11:00:00Z",
      station: "Wangdue Phodrang Station",
      energy: "20 kWh",
      cost: "Nu 320",
      duration: "55 mins"
    }
  ]
};
