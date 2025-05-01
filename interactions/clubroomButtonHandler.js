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
  } = require('discord.js');
  
  // 🔧 Hardcoded club role values (min 5 chars) mapped to actual role IDs
  const CLUB_ROLE_OPTIONS = [
    { label: 'DUCA', value: 'role_duca' },
    { label: 'DESA', value: 'role_desa' },
    { label: 'DDSC', value: 'role_ddsc' },
    { label: 'JASS', value: 'role_jass' },
    { label: 'LTUCS', value: 'role_ltucs' },
    { label: 'MISC', value: 'role_misc' },
    { label: 'RISC', value: 'role_risc' },
  ];
  
  const ROLE_ID_MAP = {
    role_duca: '1366309653134311434',
    role_desa: '1366309652794441744',
    role_ddsc: '1366309652794441745',
    role_jass: '1366309652794441743',
    role_ltucs: '1366309652794441742',
    role_misc: '1366309652794441741',
    role_risc: '1366309652794441740',
  };
  
  module.exports = {
    customId: 'clubroom',
  
    generateClubroomRequestMessage: () => ({
        content: `# 🎓 **Request a Private Clubroom**
      
    Need a space to collaborate with members of specific clubs? Use this tool to create a private text channel — or *clubroom* — that's only visible to the clubs you choose.
      
    Click the button below and:
    • Select up to **5 club roles** to invite
    • Provide a name for your new clubroom
      
    🔒 The bot will automatically create the private channel and notify the invited clubs.
      
    ---
      
    💡 **Need to invite more than 5 clubs?**  
    Use the slash command instead:
    \`/clubroom name: your-channel-name roles: DUCA, DESA, JASS, ...\`  
    You can type club names separated by commas. Make sure the acronym of the club and that it is spelled exactly as they appear in the server.
      
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
        // 📁 Button clicked
        if (interaction.customId === 'clubroom:request') {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('clubroom:roles')
            .setPlaceholder('Select club roles (max 5)')
            .setMinValues(1)
            .setMaxValues(5)
            .addOptions(CLUB_ROLE_OPTIONS);
  
          const row = new ActionRowBuilder().addComponents(selectMenu);
  
          await interaction.reply({
            content: 'Select the clubs to invite:',
            components: [row],
            flags: 64, // ephemeral
          });
        }
  
        // 🎛️ Role dropdown submitted
        else if (interaction.customId === 'clubroom:roles') {
          const selectedValues = interaction.values;
          console.log('✅ Selected dropdown roles:', selectedValues);
  
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
  
        // 📝 Modal submitted
        else if (interaction.customId.startsWith('clubroom:modal:')) {
          const name = interaction.fields.getTextInputValue('channel_name');
          const selectedValues = interaction.customId.split(':')[2].split(',');
          const roleIds = selectedValues.map(val => ROLE_ID_MAP[val]).filter(Boolean);
          const { guild, member } = interaction;
  
          const categoryId = '1366309654929477720'; // Replace this
  
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
          const welcomeMsg = `👋 Welcome! This clubroom was requested by <@${member.user.id}>.\nInvited clubs: ${roleMentions}`;
          await newChannel.send({ content: welcomeMsg });
  
          await interaction.reply({
            content: `✅ Your private clubroom <#${newChannel.id}> has been created!`,
            flags: 64, // ephemeral
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
  
  
// const CLUB_ROLES = [
//   { label: 'DUCA', value: '1366309653134311434' },
//    { label: 'DESA', value: '1366309652794441744' },
//    { label: 'DDSC', value: '1366309652794441745' },
//    { label: 'JASS', value: '1366309652794441743' },
//    { label: 'LTUCS', value: '1366309652794441742' },
//    { label: 'MISC', value: '1366309652794441741' },
//    { label: 'RISC', value: '1366309652794441740' },
//  ];