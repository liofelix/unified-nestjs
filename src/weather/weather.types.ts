export type WeatherDay = "today" | "tomorrow";

export interface WeatherLocation {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherDailySummary {
  location: WeatherLocation;
  date: string;
  weather: {
    code: number;
    description: string;
  };
  temperature: {
    min: number;
    max: number;
    unit: "°C";
  };
  precipitation: {
    probabilityMax: number;
    amount: number;
    unit: "mm";
  };
  wind: {
    speedMax: number;
    unit: "km/h";
  };
}

export interface WeatherCurrentSummary {
  location: WeatherLocation;
  time: string;
  weather: {
    code: number;
    description: string;
  };
  temperature: {
    actual: number;
    apparent: number;
    unit: "°C";
  };
  wind: {
    speed: number;
    unit: "km/h";
  };
}

export interface WeatherSseEvent {
  type: "meta" | "delta" | "done" | "error";
  data: Record<string, string>;
}
