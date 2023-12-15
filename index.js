import Discord from 'discord.js';
import "dotenv/config";
import express from 'express';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());


const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function discordE(prompt) {
  return new Promise(async (resolve, reject) => {
    try {
      const promptText = decodeURIComponent(prompt);
      console.log(promptText);

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = response.text();
      console.log(text);

      const textWithWatermark = `${text} `;

      const data = {
        text: textWithWatermark,
      };

      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

app.get('/generateText/:promptText', async (req, res) => {
  try {
    const promptText = req.params.promptText;
    const response = await discordE(promptText);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (msg) => {
  if (msg.content.startsWith('!generateText')) {
    const promptText = msg.content.slice('!generateText'.length).trim();
    try {
      msg.reply("Request Recieved");
      const response = await discordE(promptText);
      
      // Split the text into chunks of 2000 characters or less
      const chunks = response.text.match(/.{1,2000}/gs) || [];
      
      // Send each chunk as a separate message
      for (const chunk of chunks) {
        msg.reply(chunk);
      }
    } catch (error) {
      console.error(error);
      
      msg.reply('Error generating text. Please try again.');
    }
  }
  
});



client.login(process.env.BOT_TOKEN);
