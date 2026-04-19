import { type Database } from "@/types/supabase";

export const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  artificial_intelligence: "Artificial Intelligence",
  machine_learning: "Machine Learning",
  natural_language_processing: "Natural Language Processing",
  computer_vision: "Computer Vision",
  robotics_automation: "Robotics & Automation",
  cybersecurity: "Cybersecurity",
  cloud_computing: "Cloud Computing",
  data_science_analytics: "Data Science & Analytics",
  blockchain_crypto: "Blockchain & Crypto",
  quantum_computing: "Quantum Computing",
  startups_venture: "Startups & Venture",
  tech_policy_regulation: "Tech Policy & Regulation",
  consumer_tech: "Consumer Tech",
  developer_tools: "Developer Tools",
  semiconductors_hardware: "Semiconductors & Hardware",
  healthcare_biotech: "Healthcare & Biotech",
  climate_energy: "Climate & Energy",
  space_technology: "Space Technology",
};

export const MIN_TOPIC_SELECTIONS = 5;

/**
 * Current consent version. When we update policies, bump this.
 * Users whose consent_version_accepted < this value will be prompted to re-consent.
 */
export const CURRENT_CONSENT_VERSION = "v1.0";

export const HISTORY_IMPORT_DOMAIN_WEIGHT_CAP = 0.5;

export const HISTORY_IMPORT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const HISTORY_IMPORT_MAX_AGE_DAYS = 90;

export const HISTORY_IMPORT_PREVIEW_TTL_HOURS = 24;

export const TIMEZONES = [
  "Pacific/Auckland",
  "Australia/Sydney",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/Moscow",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/London",
  "Europe/Lisbon",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Etc/GMT",
];
