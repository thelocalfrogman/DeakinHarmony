// interactions/clubroomButtonHandler.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
  ComponentType,
} = require('discord.js');

const { fetchClubRoles } = require('../data/clubRoles');

const userSelections = new Map();

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

module.exports = {
  customId: 'clubroom',

  generateClubroomRequestMessage: () => ({
    content: `# 🎓 **Request a Private Clubroom**
  
  Need a space to collaborate with members of specific clubs? Use this tool to create a private text channel — or *clubroom* — that's only visible to the clubs you choose.
  
  ### How it works:
  1. Click the **Request Clubroom** button below.
  2. Use the **dropdown menus** to select up to **5 club roles per menu** (you can use more than one dropdown).
  3. **Club options are listed in alphabetical order** to make them easier to find.
  4. Click **✅ Confirm Selection** once you've chosen all the clubs you want to invite.
  5. Enter a name for the channel in the popup form.
  6. The bot will create the private channel and notify all invited clubs automatically.
  
  🔒 Only members of the selected roles will be able to view and use the channel.
  
  ---
  
  💡 **Need to invite more than 25 clubs?**  
  💡 **Want to invite more than 5 clubs from the same dropdown menu?**  
  Use the slash command instead:
  \`/clubroom name: your-channel-name clubs: DUCA, DESA, JASS, ...\`  
  Be sure to type the club names exactly as they appear in the server.
  
  If you run into any issues or need help, reach out to a Helper or Admin.`,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('clubroom:request')
          .setLabel('📁 Request Clubroom')
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  }),

  async execute(interaction) {
    try {
      if (interaction.customId === 'clubroom:request') {
        const clubRoles = (await fetchClubRoles()).sort((a, b) => a.label.localeCompare(b.label));
        const roleChunks = chunkArray(clubRoles, 25);
        const rows = roleChunks.map((chunk, index) =>
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`clubroom:roles:${index}`)
              .setPlaceholder(`Select club roles ${index + 1}`)
              .setMinValues(0)
              .setMaxValues(5)
              .addOptions(chunk.map(r => ({ label: r.label, value: r.value })))
          )
        );

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('clubroom:confirm')
              .setLabel('✅ Confirm Selection')
              .setStyle(ButtonStyle.Success)
          )
        );

        await interaction.reply({
          content: 'Select the club roles you want to invite across the dropdowns, then click Confirm:',
          components: rows,
          flags: 64,
        });
      }

      else if (interaction.customId.startsWith('clubroom:roles:')) {
        const existing = userSelections.get(interaction.user.id) || [];
        userSelections.set(interaction.user.id, [...new Set([...existing, ...interaction.values])]);

        await interaction.reply({
          content: '✅ Roles added. Click confirm when ready.',
          flags: 64,
        });
      }

      else if (interaction.customId === 'clubroom:confirm') {
        const selectedValues = userSelections.get(interaction.user.id) || [];

        if (selectedValues.length === 0) {
          return await interaction.reply({
            content: '⚠️ No roles selected. Please select at least one club.',
            flags: 64,
          });
        }

        const modal = new ModalBuilder()
          .setCustomId(`clubroom:modal:${selectedValues.join(',')}`)
          .setTitle('Request a Clubroom');

        const nameInput = new TextInputBuilder()
          .setCustomId('channel_name')
          .setLabel('Channel name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput)
        );

        await interaction.showModal(modal);
      }

      else if (interaction.customId.startsWith('clubroom:modal:')) {
        const name = interaction.fields.getTextInputValue('channel_name');
        const selectedValues = interaction.customId.split(':')[2].split(',');
        const clubRoles = await fetchClubRoles();
        const roleIds = selectedValues.map(val => clubRoles.find(r => r.value === val)?.id).filter(Boolean);
        const { guild, member } = interaction;

        const categoryId = '1366309654929477720';

        const overwrites = [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
        ];

        const mentionedRoles = [];

        for (const roleId of roleIds) {
          const role = guild.roles.cache.get(roleId);
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
        const welcomeMsg = `👋 Welcome! This clubroom was requested by <@${member.user.id}>.\nInvited roles: ${roleMentions}`;
        await newChannel.send({ content: welcomeMsg });

        userSelections.delete(member.user.id);

        await interaction.reply({
          content: `✅ Your private clubroom <#${newChannel.id}> has been created!`,
          flags: 64,
        });
      }
    } catch (error) {
      console.error('❌ Error handling interaction in clubroom handler:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Something went wrong. Please try again or contact an admin.',
          flags: 64,
        });
      }
    }
  },
};