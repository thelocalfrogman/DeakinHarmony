// interactions/renameCollabHandler.js
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    PermissionsBitField,
  } = require('discord.js');
  
  const { supabase } = require('../utils/supabaseClient');
  
  module.exports = {
    customId: 'rename-collab',
  
    async execute(interaction) {
      if (interaction.customId === 'rename-collab:select') {
        const selectedChannelId = interaction.values[0];
  
        const modal = new ModalBuilder()
          .setCustomId(`rename-collab:modal:${selectedChannelId}`)
          .setTitle('Rename Collaboration Channel');
  
        const nameInput = new TextInputBuilder()
          .setCustomId('new_channel_name')
          .setLabel('New channel name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
  
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);
      } else if (interaction.customId.startsWith('rename-collab:modal:')) {
        const newName = interaction.fields.getTextInputValue('new_channel_name');
        const channelId = interaction.customId.split(':')[2];
  
        const guild = interaction.guild;
        const channel = guild.channels.cache.get(channelId);
  
        if (!channel) {
          return await interaction.reply({
            content: '❌ Could not find the selected channel.',
            ephemeral: true,
          });
        }
  
        const message = await channel.send({
          content: `🔧 This channel has been renamed by <@${interaction.user.id}> to **${newName}**.`,
        });
  
        await message.pin().catch(() => {});
        await channel.setName(newName);
  
        await interaction.reply({
          content: `✅ Channel renamed to **${newName}** and update posted in <#${channelId}>`,
          ephemeral: true,
        });
      }
    },
  };
  