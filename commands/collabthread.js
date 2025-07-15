// commands/collabthread.js
const { SlashCommandBuilder } = require('discord.js');
const { supabase } = require('../utils/supabaseClient');
const { fetchClubRoles } = require('../data/clubRoles');
const { generateCollabButtonMessage } = require('../interactions/collabthreadHandler');

const HUB_CHANNEL_ID = '1366718740351418400'; // update this with your actual channel ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collabthread')
    .setDescription('Propose a collaboration idea between clubs')
    .addStringOption(option =>
      option.setName('idea')
        .setDescription('Brief description of the collaboration')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('clubs')
        .setDescription('Comma-separated list of club acronyms or role mentions')
        .setRequired(true)),

  async execute(interaction) {
    const idea = interaction.options.getString('idea');
    const clubsInput = interaction.options.getString('clubs');

    if (!clubsInput) {
      return interaction.reply({
        content: '❌ You must provide a comma-separated list of clubs.',
        ephemeral: true,
      });
    }

    const clubNames = clubsInput.split(',').map(c => c.trim().replace(/^<@&|>$/g, ''));
    const allClubRoles = await fetchClubRoles();

    const selectedRoles = allClubRoles.filter(role =>
      clubNames.includes(role.value) || clubNames.includes(role.label) || clubNames.includes(role.id)
    );

    if (selectedRoles.length === 0) {
      return interaction.reply({
        content: '❌ None of the provided club names matched known clubs.',
        ephemeral: true,
      });
    }

    const { guild, user } = interaction;
    const mentionList = selectedRoles.map(r => `<@&${r.id}>`).join(', ');
    const hubChannel = await guild.channels.fetch(HUB_CHANNEL_ID).catch(() => null);

    if (!hubChannel?.isTextBased?.()) {
      return interaction.reply({
        content: '❌ Collaboration hub channel is invalid or inaccessible.',
        ephemeral: true,
      });
    }

    // Use the same button as in collabthreadHandler.js
    const collabButton = generateCollabButtonMessage().components[0];

    const message = await hubChannel.send({
      content: `📢 **New Collaboration Proposal** by <@${user.id}>\n💡 _${idea}_\n📣 Clubs invited: ${mentionList}\n✅ React with ✅ to show interest.\n### If you want to propose your own collaboration, use the button below!`,
      components: [collabButton],
    });

    await message.react('✅');

    await supabase.from('collab_proposals').insert({
      user_id: user.id,
      description: idea,
      roles: selectedRoles.map(r => r.value),
      timestamp: new Date().toISOString(),
      message_id: message.id,
      channel_created: false,
      archived: false,
    });

    await interaction.reply({
      content: `✅ Your idea has been posted in <#${HUB_CHANNEL_ID}>. Invited clubs have been notified.`,
      ephemeral: true,
    });
  },
};
