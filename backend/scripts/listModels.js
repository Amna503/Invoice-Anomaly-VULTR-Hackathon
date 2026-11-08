import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.VULTR_INFERENCE_API_KEY,
  baseURL: process.env.VULTR_INFERENCE_BASE_URL || 'https://api.vultrinference.com/v1'
});

async function listModels() {
  try {
    console.log('Fetching available models from Vultr Serverless Inference...\n');

    const models = await client.models.list();

    console.log(`Found ${models.data.length} models:\n`);

    models.data.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
    });

    console.log(`\nCurrent MODEL_NAME: ${process.env.MODEL_NAME || 'not set'}`);

  } catch (error) {
    console.error('Error fetching models:', error.message);

    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('\nCheck your VULTR_INFERENCE_API_KEY in .env file');
    }

    process.exit(1);
  }
}

listModels();
