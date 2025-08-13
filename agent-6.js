import { AgentFactory } from '@virtron/agency';
import { webSearchTool } from '@virtron/agency-tools';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAgent() {
    try {
        // Initialize AgentFactory with API keys from environment variables
        const factory = new AgentFactory({
            defaultProvider: 'gemini', // Or any other default provider you prefer
            apiKeys: {
                gemini: process.env.GEMINI_API_KEY,
                anthropic: process.env.ANTHROPIC_API_KEY,
                openai: process.env.OPENAI_API_KEY,
                groq: process.env.GROQ_API_KEY,
                openrouter: process.env.OPENROUTER_API_KEY,
                mistral: process.env.MISTRAL_API_KEY
            },
            baseDir: __dirname // Set baseDir to the current directory
        });

        // Register the webSearchTool
        factory.registerTool(webSearchTool);

        // Load agent configuration
        const agentConfig = factory.loadConfig('agent-6.json');
        console.log('Loaded Agent Configuration:', JSON.stringify(agentConfig, null, 2));

        // Create the agent
        const agents = factory.createAgents(agentConfig);
        const goalPlanner = agents['goalPlanner'];

        if (goalPlanner) {
            console.log(`Agent "${goalPlanner.name}" created successfully.`);
            console.log('Agent Description:', goalPlanner.description);
            console.log('Agent Role:', goalPlanner.role);
            console.log('Agent Goals:', goalPlanner.goals);

            // The updated travelerPreferences object
            const travelerPreferences = {
                numTravelers: 2,
                ageRange: "30s-40s",
                sharedInterests: [
                    "Yoga",
                    "whole foods",
                    "sightseeing",
                    "beaches",
                    "St. Petersburg's vibrant arts scene (murals)",
                    "Nature/Botanical gardens",
                    "Beach culture",
                    "Farmers markets",
                    "Cooking local healthy food"
                ],
                dietaryRestrictions: "None specified, but interested in 'whole foods'",
                mobilityConcerns: "None",
                timeOfYear: "Aug 10-15, 2025",
                tripDuration: "5 days",
                travelDistance: "Short-haul",
                destinationIdeas: [
                    "St. Petersburg/Clearwater, Florida"
                ],
                totalBudget: "2400",
                flightPref: "Unspecified, but budget-friendly",
                accommodationPref: "Airbnb with kitchen, quiet",
                foodPref: "Local, whole foods, cooking some meals",
                activityPref: "Yoga, beaches, sightseeing, museums (Dali), parks, markets",
                accommodationType: "Airbnb",
                accommodationFeature: "Kitchen, quiet",
                numRooms: 1,
                tripPace: "Relaxed",
                tripPurpose: "Relaxation and Wellness Coastal Trip",
                freeTime: "Prioritize early mornings/late afternoons for outdoor activities",
                mustHaves: [
                    "Beaches",
                    "quiet lodging",
                    "kitchen for cooking"
                ],
                dealBreakers: [
                    "Noisy areas"
                ],
                flightPreferences: "Budget-friendly",
                accommodationBudgetPreference: "Budget-friendly",
                foodPreferences: "Local, whole foods, budget-friendly",
                activityPreferences: "Free/low-cost activities",
                departureLocation: "Philadelphia, PA"
            };

            console.log('\nRunning Goal Planning Agent...');
            // The goalPlanner agent expects a single input string, but the prompt is a large object
            const result = await goalPlanner.run(JSON.stringify(travelerPreferences));
            console.log('\nAgent Result:', result);
        } else {
            console.error('Agent "goalPlanner" not found in the loaded configuration.');
        }

    } catch (error) {
        console.error('Error running agent:', error);
    }
}

runAgent();
