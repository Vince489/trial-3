import { AgentFactory } from '@virtron/agency';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import open from 'open';
// Import tools used in vp9.json
import { webSearchTool, dateTimeTool, calculatorTool } from '@virtron/agency-tools';

// Load environment variables from a .env file.
dotenv.config();

async function main() {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Initialize the factories with the Gemini API key.
    const agentFactory = new AgentFactory({
      defaultProvider: 'gemini',
      apiKeys: {
        gemini: GEMINI_API_KEY
      },
      baseDir: path.dirname(fileURLToPath(import.meta.url))
    });

    // Register tools used by the agents in vp9.json
    agentFactory.registerTool(webSearchTool);
    agentFactory.registerTool(dateTimeTool);
    agentFactory.registerTool(calculatorTool);

    // Get the directory name of the current module.
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Define the path to the vp9 configuration file.
    const configPath = path.join(__dirname, 'vp9.json');

    // Load the configuration from the JSON file.
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

    // Create agents from the configuration
    const agents = agentFactory.createAgents(config.agents);

    // Get the brief
    const brief = config.brief['st-pete-clearwater-trip-001'];

    // Execute the workflow manually
    console.log('Vacation Planner (vp9.json) loaded successfully:');
    console.log('- brief:', JSON.stringify(brief, null, 2));

    // Create a results object to store the output of each step
    const results = {};

    // Execute each job in the workflow
    const workflow = config.team.vacationTeam.workflow;

    // 1. Plan Goals
    console.log('\n=== EXECUTING: planGoals ===');
    const goalPlanner = agents['goalPlanner'];
    if (goalPlanner) {
      console.log(`Running Goal Planning Agent...`);
      results.planGoals = await goalPlanner.run(JSON.stringify(brief));
      console.log('planGoals result:', results.planGoals);
    } else {
      console.error('Agent "goalPlanner" not found in the loaded configuration.');
      results.planGoals = { error: 'Agent not found' };
    }

    // 2. Suggest Destinations
    console.log('\n=== EXECUTING: suggestDestinations ===');
    const destinationSuggester = agents['destinationSuggester'];
    if (destinationSuggester) {
      console.log(`Running Destination Suggestion Agent...`);
      const suggestDestinationsInput = {
        travelerPreferences: results.planGoals
      };
      results.suggestDestinations = await destinationSuggester.run(JSON.stringify(suggestDestinationsInput));
      console.log('suggestDestinations result:', results.suggestDestinations);
    } else {
      console.error('Agent "destinationSuggester" not found in the loaded configuration.');
      results.suggestDestinations = { error: 'Agent not found' };
    }

    // 3. Research Destinations
    console.log('\n=== EXECUTING: researchDestinations ===');
    const destinationResearcher = agents['destinationResearcher'];
    if (destinationResearcher) {
      console.log(`Running Destination Research Agent...`);
      const researchDestinationsInput = {
        parsedVacationDetails: results.planGoals,
        chosenDestination: results.suggestDestinations
      };
      results.researchDestinations = await destinationResearcher.run(JSON.stringify(researchDestinationsInput));
      console.log('researchDestinations result:', results.researchDestinations);
    } else {
      console.error('Agent "destinationResearcher" not found in the loaded configuration.');
      results.researchDestinations = { error: 'Agent not found' };
    }

    // 4. Find Accommodations
    console.log('\n=== EXECUTING: findAccommodations ===');
    const accommodationAgent = agents['accommodationAgent'];
    if (accommodationAgent) {
      console.log(`Running Accommodation Agent...`);
      const findAccommodationsInput = {
        parsedVacationDetails: results.planGoals,
        destinationResults: results.researchDestinations
      };
      results.findAccommodations = await accommodationAgent.run(JSON.stringify(findAccommodationsInput));
      console.log('findAccommodations result:', results.findAccommodations);
    } else {
      console.error('Agent "accommodationAgent" not found in the loaded configuration.');
      results.findAccommodations = { error: 'Agent not found' };
    }

    // 5. Find Transportation
    console.log('\n=== EXECUTING: findTransportation ===');
    const transportAgent = agents['transportAgent'];
    if (transportAgent) {
      console.log(`Running Transportation Agent...`);
      const findTransportationInput = {
        parsedVacationDetails: results.planGoals,
        destinationResults: results.researchDestinations
      };
      results.findTransportation = await transportAgent.run(JSON.stringify(findTransportationInput));
      console.log('findTransportation result:', results.findTransportation);
    } else {
      console.error('Agent "transportAgent" not found in the loaded configuration.');
      results.findTransportation = { error: 'Agent not found' };
    }

    // 6. Plan Activities
    console.log('\n=== EXECUTING: planActivities ===');
    const activityPlanner = agents['activityPlanner'];
    if (activityPlanner) {
      console.log(`Running Activity Planner Agent...`);
      const planActivitiesInput = {
        parsedVacationDetails: results.planGoals,
        destinationResults: results.researchDestinations
      };
      results.planActivities = await activityPlanner.run(JSON.stringify(planActivitiesInput));
      console.log('planActivities result:', results.planActivities);
    } else {
      console.error('Agent "activityPlanner" not found in the loaded configuration.');
      results.planActivities = { error: 'Agent not found' };
    }

    // 7. Plan Dining
    console.log('\n=== EXECUTING: planDining ===');
    const diningAgent = agents['diningAgent'];
    if (diningAgent) {
      console.log(`Running Dining Agent...`);
      const planDiningInput = {
        parsedVacationDetails: results.planGoals,
        destinationResults: results.researchDestinations
      };
      results.planDining = await diningAgent.run(JSON.stringify(planDiningInput));
      console.log('planDining result:', results.planDining);
    } else {
      console.error('Agent "diningAgent" not found in the loaded configuration.');
      results.planDining = { error: 'Agent not found' };
    }

    // 8. Create Budget
    console.log('\n=== EXECUTING: createBudget ===');
    const budgetingAgent = agents['budgetingAgent'];
    if (budgetingAgent) {
      console.log(`Running Budgeting Agent...`);
      const createBudgetInput = {
        parsedVacationDetails: results.planGoals,
        destinationResults: results.researchDestinations,
        accommodationsResults: results.findAccommodations,
        transportResults: results.findTransportation,
        activitiesResults: results.planActivities,
        diningResults: results.planDining
      };
      results.createBudget = await budgetingAgent.run(JSON.stringify(createBudgetInput));
      console.log('createBudget result:', results.createBudget);
    } else {
      console.error('Agent "budgetingAgent" not found in the loaded configuration.');
      results.createBudget = { error: 'Agent not found' };
    }

    // 9. Create Itinerary
    console.log('\n=== EXECUTING: createItinerary ===');
    const itineraryCoordinator = agents['itineraryCoordinator'];
    if (itineraryCoordinator) {
      console.log(`Running Itinerary Coordinator...`);
      const createItineraryInput = {
        parsedVacationDetails: results.planGoals,
        destinationResults: results.researchDestinations,
        accommodationsResults: results.findAccommodations,
        transportResults: results.findTransportation,
        activitiesResults: results.planActivities,
        diningResults: results.planDining,
        budgetSummary: results.createBudget
      };
      results.createItinerary = await itineraryCoordinator.run(JSON.stringify(createItineraryInput));
      console.log('createItinerary result:', results.createItinerary);
    } else {
      console.error('Agent "itineraryCoordinator" not found in the loaded configuration.');
      results.createItinerary = { error: 'Agent not found' };
    }

    // 10. Review Plan
    console.log('\n=== EXECUTING: reviewPlan ===');
    const reviewAndRefineAgent = agents['reviewAndRefineAgent'];
    if (reviewAndRefineAgent) {
      console.log(`Running Review and Refine Agent...`);
      const reviewPlanInput = {
        parsedVacationDetails: results.planGoals,
        destinationResults: results.researchDestinations,
        accommodationsResults: results.findAccommodations,
        transportResults: results.findTransportation,
        activitiesResults: results.planActivities,
        diningResults: results.planDining,
        budgetSummary: results.createBudget,
        itineraryResults: results.createItinerary
      };
      results.reviewPlan = await reviewAndRefineAgent.run(JSON.stringify(reviewPlanInput));
      console.log('reviewPlan result:', results.reviewPlan);
    } else {
      console.error('Agent "reviewAndRefineAgent" not found in the loaded configuration.');
      results.reviewPlan = { error: 'Agent not found' };
    }

    console.log('\n=== VACATION PLANNING RESULTS ===\n');
    console.log('Results object contains keys:', Object.keys(results));

    // Display the results for each step in the workflow as HTML
    let htmlContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>Vacation Planning Results</title>\n<style>\nbody { font-family: Arial, sans-serif; margin: 2em; background: #f9f9f9; }\nh1 { color: #2a7ae2; }\nh2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }\npre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }\n.warning { color: #b00; font-weight: bold; }\n</style>\n</head>\n<body>\n<h1>Vacation Planning Results</h1>\n<p><strong>Results object contains keys:</strong> [ ${Object.keys(results).join(', ')} ]</p>\n`;

    for (const jobName of workflow) {
      if (results[jobName]) {
        const resultText = typeof results[jobName] === 'object' ? JSON.stringify(results[jobName], null, 2) : results[jobName];
        console.log(`${jobName.replace(/([A-Z])/g, ' $1').trim()} (length: ${resultText.length} characters):`);
        console.log(resultText);
        console.log('\n');
        htmlContent += `<h2>${jobName.replace(/([A-Z])/g, ' $1').trim()} <span style='font-size:0.7em;color:#888;'>(length: ${resultText.length} characters)</span></h2>\n<pre>${resultText}</pre>\n`;
      } else {
        console.log(`WARNING: No ${jobName} results found!`);
        htmlContent += `<h2>${jobName.replace(/([A-Z])/g, ' $1').trim()}</h2>\n<p class='warning'>WARNING: No results found for this step.</p>\n`;
      }
    }
    htmlContent += `</body>\n</html>`;

    // Save the results to an HTML file.
    const resultsFilePath = path.join(__dirname, 'vacation-results-vp9.html');
    await fs.writeFile(resultsFilePath, htmlContent, 'utf8');
    console.log(`Results saved to ${resultsFilePath}`);
    // Automatically open the results file using npm open
    await open(resultsFilePath);

    console.log('Vacation planning workflow completed successfully!');

  } catch (error) {
    console.error('Error during workflow execution:', error);
    if (error.response && error.response.data) {
      console.error('API Error Details:', error.response.data);
    }
  }
}

// Execute the main function.
main();
