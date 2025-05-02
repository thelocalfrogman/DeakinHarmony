// commands/rename-collab.js
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField,
  } = require('discord.js');
  
  const { supabase } = require('../utils/supabaseClient');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('rename-collab')
      .setDescription('Rename one of your active collaboration channels.'),
  
    async execute(interaction) {
      const userId = interaction.user.id;
  
      const { data: proposals, error } = await supabase
        .from('collab_proposals')
        .select('channel_id')
        .eq('user_id', userId)
        .eq('archived', false);
  
      if (error || !proposals || proposals.length === 0) {
        return interaction.reply({
          content: '❌ You have no active collaboration channels to rename.',
          ephemeral: true,
        });
      }
  
      const channelOptions = [];

      for (const p of proposals) {
        if (!p.channel_id) continue;

        const channel = interaction.guild.channels.cache.get(p.channel_id)
         || await interaction.guild.channels.fetch(p.channel_id).catch(() => null);

        if (channel) {
          channelOptions.push({
            label: `#${channel.name}`,
            value: p.channel_id,
          });
        }
      }
  
      if (channelOptions.length === 0) {
        return interaction.reply({
          content: '❌ No valid channel IDs found.',
          ephemeral: true,
        });
      }
  
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('rename-collab:select')
        .setPlaceholder('Select a collaboration channel to rename')
        .addOptions(channelOptions);
  
      const row = new ActionRowBuilder().addComponents(selectMenu);
  
      await interaction.reply({
        content: 'Select a channel to rename:',
        components: [row],
        ephemeral: true,
      });
    },
  };
  