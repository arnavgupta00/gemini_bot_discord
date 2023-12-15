import Discord from 'discord.js';
import "dotenv/config"
import express from 'express';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client, GatewayIntentBits } from 'discord.js';
import WebSocket from 'ws';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (socket) => {
  console.log('WebSocket connected');

  // You can handle WebSocket messages here and broadcast updates to connected clients
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit('connection', socket, request);
  });
});

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

app.get('/', (req, res) => {
  try {
    res.redirect('/generateText/hello');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/generateText/:promptText', async (req, res) => {
  try {
    const promptText = req.params.promptText;
    const response = await discordE(promptText);

    // Broadcast the response to all connected WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(response));
      }
    });

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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
      msg.reply('Request Received');
      const response = await discordE(promptText);

      if (response && response.text) {
        // If response is not empty, send it to the user
        msg.reply(response.text);

        // Broadcast the response to all connected WebSocket clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(response));
            
          }
        });
      } else {
        // Handle the case where the response is empty
        msg.reply('The generated text is empty.');
      }
    } catch (error) {
      console.error(error);
      msg.reply('Error generating text. Please try again.');
    }
  }
});


client.login(process.env.BOT_TOKEN);
