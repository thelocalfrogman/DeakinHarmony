// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, Collection, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// Load command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Load interaction handlers
client.interactions = new Collection();
const interactionFiles = fs.readdirSync('./interactions').filter(file => file.endsWith('.js'));
for (const file of interactionFiles) {
  const handler = require(`./interactions/${file}`);
  client.interactions.set(handler.customId, handler);
}

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);

  const targetChannelId = '1366309654929477721';
  const targetChannel = client.channels.cache.get(targetChannelId);
  if (targetChannel) {
    const { generateClubroomRequestMessage } = require('./interactions/clubroomButtonHandler');
    const messagePayload = generateClubroomRequestMessage();
    await targetChannel.send(messagePayload);
  }
});

client.on(Events.InteractionCreate, async interaction => {
    console.log('🧩 Interaction received:', interaction.customId);
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  } else {
    for (const [id, handler] of client.interactions.entries()) {
      if (interaction.customId.startsWith(id)) {
        try {
          await handler.execute(interaction);
        } catch (error) {
          console.error(error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'An error occurred.', ephemeral: true });
          } else {
            await interaction.reply({ content: 'An error occurred.', ephemeral: true });
          }
        }
        break;
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
