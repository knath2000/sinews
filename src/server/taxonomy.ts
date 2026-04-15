// 18-topic taxonomy for article classification
export const TOPIC_TAXONOMY = [
  "artificial_intelligence",
  "machine_learning",
  "natural_language_processing",
  "computer_vision",
  "robotics_automation",
  "cybersecurity",
  "cloud_computing",
  "data_science_analytics",
  "blockchain_crypto",
  "quantum_computing",
  "startups_venture",
  "tech_policy_regulation",
  "consumer_tech",
  "developer_tools",
  "semiconductors_hardware",
  "healthcare_biotech",
  "climate_energy",
  "space_technology",
] as const;

export type TopicTaxonomy = (typeof TOPIC_TAXONOMY)[number];

// Signal weights for ranking
export const SIGNAL_WEIGHTS = {
  manual_topic: 1.0,
  thumbs_up: 0.8,
  thumbs_down: -1.0,
  x_follows: 0.6,
  x_like_bookmark: 0.7,
  google_profile_org: 0.5,
} as const;
