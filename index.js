// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

client.commands = new Collection();
client.interactions = new Collection();

// Load command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Load interaction handlers
const interactionFiles = fs.readdirSync('./interactions').filter(file => file.endsWith('.js'));
for (const file of interactionFiles) {
  const handler = require(`./interactions/${file}`);
  if (handler.customId && typeof handler.execute === 'function') {
    client.interactions.set(handler.customId, handler);
  }
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

  const { generateCollabButtonMessage } = require('./interactions/collabthreadHandler');
  const collabChannel = await client.channels.fetch('1366718740351418400');
  await collabChannel.send(generateCollabButtonMessage());
});

client.on(Events.InteractionCreate, async interaction => {
  const baseId = interaction.customId?.split(':')[0] || interaction.commandName;
  const handler = interaction.isChatInputCommand()
    ? client.commands.get(baseId)
    : client.interactions.get(baseId);

  if (!handler || typeof handler.execute !== 'function') return;

  try {
    await handler.execute(interaction);
  } catch (error) {
    console.error(`❌ Error in interaction [${baseId}]:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'An error occurred.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'An error occurred.', ephemeral: true });
    }
  }
});

const { checkReactions } = require('./interactions/collabthreadHandler');
setInterval(() => checkReactions(client), 60 * 1000); // every 1 minute

client.login(process.env.DISCORD_TOKEN);
