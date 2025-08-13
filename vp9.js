import { AgentFactory, TeamFactory, AgencyFactory } from '@virtron/agency';
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
      }
    });

    // Register tools used by the agents in vp9.json
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

    console.log('Vacation Planner Agency (vp9.json) loaded successfully:');
    console.log('- name:', agency.name);
    console.log('- team:', Object.keys(agency.team));
    console.log('- brief:', Object.keys(agency.brief));

    // The job to execute is 'st-pete-clearwater-trip-001' as in vp9.json
    const jobId = 'st-pete-clearwater-trip-001';
    const teamName = 'vacationTeam'; // The team name is 'vacationTeam'

    if (!agency.brief[jobId]) {
        throw new Error(`Brief with ID "${jobId}" not found in vp9.json`);
    }
    if (!agency.team[teamName]) {
        throw new Error(`Team with name "${teamName}" not found in vp9.json`);
    }

    // Create a custom context object with the agency instance
    const context = {
      agency: agency
    };

    // Get the brief
    const brief = agency.brief[jobId];

    // Assign the job to the team
    console.log(`Assigning job "${jobId}" to "${teamName}" (type: team)...`);
    agency.assignJob(jobId, teamName, 'team');

    // Execute the workflow
    console.log('Executing job...');
    console.log('Using initial inputs for the workflow:');
    console.log('- brief:', JSON.stringify(brief, null, 2));

    // Execute the team directly with the context
    const team = agency.team[teamName];
    const results = await team.run(brief, context);

    console.log('Job execution completed. Results received.');

    console.log('\n=== VACATION PLANNING RESULTS ===\n');

    console.log('Results object contains keys:', Object.keys(results));

    // Display the results for each step in the workflow as HTML
    let htmlContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>Vacation Planning Results</title>\n<style>\nbody { font-family: Arial, sans-serif; margin: 2em; background: #f9f9f9; }\nh1 { color: #2a7ae2; }\nh2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }\npre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }\n.warning { color: #b00; font-weight: bold; }\n</style>\n</head>\n<body>\n<h1>Vacation Planning Results</h1>\n<p><strong>Results object contains keys:</strong> [ ${Object.keys(results).join(', ')} ]</p>\n`;

    for (const jobName of team.workflow) {
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
