// lib/scenarios.ts
/**
 * Training Scenario Type Definitions
 * 
 * ✅ UPDATED: Scenarios are now stored in the database and fetched via API
 * This file only contains TypeScript interfaces for type safety
 * 
 * Scenarios are managed through:
 * - Backend: /training/scenarios (GET all scenarios)
 * - Backend: /training/scenarios/{id} (GET specific scenario)
 * - Backend: /training/admin/seed-defaults (POST to seed default scenarios)
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CustomerPersona {
  name: string;
  emotion: 'calm' | 'frustrated' | 'confused' | 'angry' | 'urgent';
  background: string;
  issue: string;
  desiredOutcome: string;
}

export interface Scenario {
  id: number;                    // Database ID
  scenario_id: string;           // Unique identifier (e.g., "billing_complaint")
  name: string;                  // English name
  nameUrdu: string;              // Urdu name
  description: string;           // English description
  descriptionUrdu: string;       // Urdu description
  difficulty: 'easy' | 'medium' | 'hard';
  is_default: boolean;           // Is this a default scenario or personalized?
  
  // Optional fields (present when fetching full scenario details)
  customerPersona?: CustomerPersona;
  systemPrompt?: string;
  greeting?: string;
  endConditions?: string[];
  evaluationFocus?: string[];
  
  // For personalized scenarios
  agent_id?: number;
  based_on_calls?: number;       // Number of QA calls this was generated from
}

export interface ScenarioListResponse {
  default: Scenario[];
  personalized: Scenario[];
}

export interface ScenarioDetailResponse {
  scenario_id: string;
  name: string;
  system_prompt: string;
  greeting: string;
  customer_name: string;
  customer_emotion: string;
  end_conditions: string[];
  evaluation_focus: string[];
}

// ============================================
// API HELPER FUNCTIONS
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Fetch all available scenarios for the current user
 * Returns both default scenarios and personalized scenarios
 */
export async function fetchScenarios(): Promise<ScenarioListResponse> {
  try {
    const response = await fetch(`${API_URL}/training/scenarios`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch scenarios: ${response.status}`);
    }

    const data = await response.json();
    return data as ScenarioListResponse;
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    throw error;
  }
}

/**
 * Fetch detailed information about a specific scenario
 * This is used by the agent to get the full system prompt and configuration
 */
export async function fetchScenarioDetails(scenarioId: string): Promise<ScenarioDetailResponse> {
  try {
    const response = await fetch(`${API_URL}/training/scenarios/${scenarioId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch scenario details: ${response.status}`);
    }

    const data = await response.json();
    return data as ScenarioDetailResponse;
  } catch (error) {
    console.error('Error fetching scenario details:', error);
    throw error;
  }
}

/**
 * Generate a personalized training scenario based on agent's QA performance
 * Only works for agents with identified weaknesses in QA calls
 */
export async function generatePersonalizedScenario(): Promise<{
  message: string;
  scenario_created: boolean;
  scenario?: {
    id: number;
    scenario_id: string;
    name: string;
    description: string;
    difficulty: string;
  };
}> {
  try {
    const response = await fetch(`${API_URL}/training/scenarios/generate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to generate scenario: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating personalized scenario:', error);
    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get difficulty badge color for UI
 */
export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  const colors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800'
  };
  return colors[difficulty];
}

/**
 * Get emotion emoji for UI
 */
export function getEmotionEmoji(emotion: string): string {
  const emojis: Record<string, string> = {
    calm: '😌',
    frustrated: '😤',
    confused: '😕',
    angry: '😠',
    urgent: '⚠️'
  };
  return emojis[emotion] || '🙂';
}

// ============================================
// NOTES FOR DEVELOPERS
// ============================================

/**
 * HOW TO ADD NEW SCENARIOS:
 * 
 * 1. Option A: Add directly to database
 *    - Insert into training_scenarios table
 *    - Set is_default = TRUE for default scenarios
 * 
 * 2. Option B: Use the seed endpoint (recommended for defaults)
 *    - Add scenario to DEFAULT_SCENARIOS in backend training.py
 *    - Call POST /training/admin/seed-defaults
 * 
 * 3. Option C: Generate personalized (for agents)
 *    - Agent must have QA calls with scores < 75
 *    - Call POST /training/scenarios/generate
 * 
 * DO NOT add scenarios to this file - they belong in the database!
 */

/**
 * SCENARIO STRUCTURE IN DATABASE:
 * 
 * CREATE TABLE training_scenarios (
 *   id SERIAL PRIMARY KEY,
 *   scenario_id VARCHAR(100) UNIQUE NOT NULL,
 *   name VARCHAR(200) NOT NULL,
 *   name_urdu VARCHAR(200),
 *   description TEXT,
 *   description_urdu TEXT,
 *   difficulty VARCHAR(20),
 *   is_default BOOLEAN DEFAULT FALSE,
 *   agent_id INTEGER REFERENCES users(id),
 *   based_on_qa_ids JSONB,
 *   customer_name VARCHAR(100),
 *   customer_emotion VARCHAR(50),
 *   customer_background TEXT,
 *   customer_issue TEXT,
 *   customer_desired_outcome TEXT,
 *   system_prompt TEXT NOT NULL,
 *   greeting TEXT,
 *   end_conditions JSONB,
 *   evaluation_focus JSONB,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 */