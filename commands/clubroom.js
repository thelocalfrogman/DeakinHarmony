const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clubroom')
    .setDescription('Request a private club channel for selected roles')
    .addStringOption(option =>
      option.setName('name').setDescription('Name of the channel').setRequired(true))
    .addStringOption(option =>
      option.setName('clubs').setDescription('Comma-separated club names to grant access (e.g DUCA, JASS, MISC, DDSC)').setRequired(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const rolesInput = interaction.options.getString('roles');
    const roleNames = rolesInput.split(',').map(r => r.trim());
    const { guild, member } = interaction;

    const categoryId = '1366309654929477720'; // Replace with actual ID

    const overwrites = [{
      id: guild.roles.everyone,
      deny: [PermissionsBitField.Flags.ViewChannel],
    }];

    const mentionedRoles = [];

    for (const roleName of roleNames) {
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (role) {
        overwrites.push({
          id: role.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        });
        mentionedRoles.push(role);
      }
    }

    const newChannel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: overwrites,
      reason: `Private clubroom requested by ${member.user.tag}`,
    });

    const roleMentions = mentionedRoles.map(r => `<@&${r.id}>`).join(', ');
    const welcomeMsg = `👋 Welcome! This clubroom was requested by <@${member.user.id}>.\nInvited clubs: ${roleMentions}`;

    await newChannel.send({ content: welcomeMsg });

    await interaction.reply({
      content: `✅ Your private clubroom <#${newChannel.id}> has been created and the invited clubs have been notified.`,
      ephemeral: true,
    });
  },
};

// categoryId = '1366309654929477720';
