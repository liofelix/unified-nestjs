/**
 * 天气领域共享类型。
 * 统一描述日期选择、地理位置以及当前和每日天气的返回结构。
 */
/** 支持查询的相对日期。 */
export type WeatherDay = "today" | "tomorrow";

/** 第三方地理编码后供天气查询使用的位置摘要。 */
export interface WeatherLocation {
  /** 城市名称。 */
  name: string;
  /** 国家名称或代码。 */
  country: string;
  /** 一级行政区名称。 */
  admin1?: string;
  /** 纬度。 */
  latitude: number;
  /** 经度。 */
  longitude: number;
  /** 位置对应的时区。 */
  timezone: string;
}

/** 今日或明日的每日天气摘要。 */
export interface WeatherDailySummary {
  /** 地理位置。 */
  location: WeatherLocation;
  /** 预报日期。 */
  date: string;
  /** WMO 天气代码及中文描述。 */
  weather: {
    /** WMO 天气代码。 */
    code: number;
    /** 面向客户端的中文天气描述。 */
    description: string;
  };
  /** 最低和最高温度。 */
  temperature: {
    /** 最低温度，单位由 unit 指定。 */
    min: number;
    /** 最高温度，单位由 unit 指定。 */
    max: number;
    /** 温度单位。 */
    unit: "°C";
  };
  /** 降水概率和预计降水量。 */
  precipitation: {
    /** 当日最高降水概率。 */
    probabilityMax: number;
    /** 预计降水量。 */
    amount: number;
    /** 降水量单位。 */
    unit: "mm";
  };
  /** 当日最大风速。 */
  wind: {
    /** 最大风速值。 */
    speedMax: number;
    /** 风速单位。 */
    unit: "km/h";
  };
}

/** 当前时刻的天气摘要。 */
export interface WeatherCurrentSummary {
  /** 地理位置。 */
  location: WeatherLocation;
  /** 当前天气观测时间。 */
  time: string;
  /** WMO 天气代码及中文描述。 */
  weather: {
    /** WMO 天气代码。 */
    code: number;
    /** 面向客户端的中文天气描述。 */
    description: string;
  };
  /** 实际温度和体感温度。 */
  temperature: {
    /** 实际温度。 */
    actual: number;
    /** 体感温度。 */
    apparent: number;
    /** 温度单位。 */
    unit: "°C";
  };
  /** 当前风速。 */
  wind: {
    /** 风速值。 */
    speed: number;
    /** 风速单位。 */
    unit: "km/h";
  };
}
