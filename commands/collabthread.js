// commands/collabthread.js
const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collabthread')
    .setDescription('Request a thread in #collaboration-hub')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the thread')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to include in the thread (optional)')
        .setRequired(false)),

  async execute(interaction) {
    const { guild, options, member } = interaction;
    const threadName = options.getString('name');
    const threadMessage = options.getString('message') || `${member} started this thread.`;

    const collabHub = guild.channels.cache.find(c => c.name === 'collaboration-hub' && c.type === ChannelType.GuildText);
    if (!collabHub) {
      return interaction.reply({ content: 'Collaboration hub channel not found.', ephemeral: true });
    }

    const starterMessage = await collabHub.send(threadMessage);

    const thread = await starterMessage.startThread({
      name: threadName,
      autoArchiveDuration: 1440,
      reason: `Thread requested by ${member.user.tag}`,
    });

    await interaction.reply({ content: `Thread created: <#${thread.id}>`, ephemeral: true });
  },
};
