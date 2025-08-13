// vp8.js - Orchestrator for the vacation planning workflow defined in vp8.json

import { AgentFactory, TeamFactory, AgencyFactory } from '@virtron/agency';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // For loading environment variables
import fs from 'fs/promises'; // For file system operations
import open from 'open'; // For opening the results HTML file

// Import tools used in vp8.json (assuming these files exist in your setup)
import { webSearchTool, dateTimeTool, calculatorTool } from '@virtron/agency-tools'; 



// Load environment variables from a .env file.
dotenv.config();

async function main() {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set. Please create a .env file with GEMINI_API_KEY=your_key_here');
    }

    // Initialize the AgentFactory with the Gemini API key.
    const agentFactory = new AgentFactory({
      defaultProvider: 'gemini',
      apiKeys: {
        gemini: GEMINI_API_KEY
      }
    });

    // Register tools
    agentFactory.registerTool(webSearchTool);
    agentFactory.registerTool(dateTimeTool);
    agentFactory.registerTool(calculatorTool);


    // Create the team and agency factories, passing the agentFactory instance.
    const teamFactory = new TeamFactory({ agentFactory });
    const agencyFactory = new AgencyFactory({
      teamFactory,
      agentFactory
    });

    // Get the directory name of the current module.
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Define the path to the vp9 configuration file.
    const configPath = path.join(__dirname, 'vp9.json');

    // Load the agency configuration from the JSON file.
    const agency = await agencyFactory.loadAgencyFromFile(configPath);

    console.log(`Vacation Planner Agency (${agency.name}) loaded successfully.`);
    console.log(`- description: ${agency.description}`);
    console.log(
      `- team: [ ${
        agency.team
          ? Object.values(agency.team).map(t => t.name).join(', ')
          : 'No teams found'
      } ]`
    );
    console.log(
      `- brief: [ ${
        agency.brief
          ? Object.keys(agency.brief).join(', ')
          : 'No briefs found'
      } ]`
    );

    // Get the brief ID from command line arguments
    const briefId = process.argv[2] || 'st-pete-clearwater-trip-001';

    if (!agency.brief[briefId]) {
      throw new Error(`Brief with ID "${briefId}" not found in vp9.json`);
    }

    // Get the workflow definition from the team
    const team = agency.team.vacationTeam;
    const workflowDefinition = team.workflow.map(step => {
      if (typeof step === 'string') {
        const job = team.jobs[step];
        return {
          jobId: step,
          assigneeId: job.agent,
          assigneeType: 'agent',
          brief: {
            title: job.description,
            overview: job.description,
            objective: job.description
          }
        };
      }
      return step;
    });

    // Run the workflow in parallel
    console.log(`\nStarting workflow for brief ID: ${briefId}\n`);
    const workflowResult = await agency.executeWorkflow(workflowDefinition, `workflow-${briefId}-${Date.now()}`, agency.brief[briefId]);
    const results = workflowResult.results;
    console.log('\n--- Workflow Execution Completed ---\n');

    // Display and save the results
    console.log('Results object contains keys:', Object.keys(results));
    console.log('\n');

    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Vacation Planning Results</title>
<style>
body { font-family: Arial, sans-serif; margin: 2em; background: #f9f9f9; }
h1 { color: #2a7ae2; }
h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
pre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }
.warning { color: #b00; font-weight: bold; }
</style>
</head>
<body>
<h1>Vacation Planning Results</h1>
<p><strong>Results object contains keys:</strong> [ ${Object.keys(results).join(', ')} ]</p>
`;

    // A list of the expected job names in your workflow
    const jobNames = [
      'planGoals',
      'suggestDestinations',
      'researchDestinations',
      'findAccommodations',
      'findTransportation',
      'planActivities',
      'planDining',
      'createBudget',
      'createItinerary',
      'reviewPlan'
    ];

    for (const jobName of jobNames) {
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
  htmlContent += `</div></body></html>`;

    // Read the trip-plan.html file
    const resultsFilePath = path.join(__dirname, 'vacation-results-st-pete.html');
    await fs.writeFile(resultsFilePath, htmlContent, 'utf8');
    console.log(`Results saved to ${resultsFilePath}`);
    // Automatically open the results file using npm open
    await open(resultsFilePath);

    console.log('Vacation planning workflow completed successfully!');

  } catch (error) {
    console.error('Error during workflow execution:', error);
  }
}

main();
