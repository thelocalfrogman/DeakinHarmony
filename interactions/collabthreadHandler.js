// interactions/collabthreadHandler.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
  ComponentType,
} = require('discord.js');

const { supabase } = require('../utils/supabaseClient');
const { fetchClubRoles } = require('../data/clubRoles');

const COLLAB_POST_LIFETIME_MS = 1000 * 60 * 60 * 24 * 5; // 5 days
const COLLAB_CATEGORY_ID = '1366309654929477720';
const HUB_CHANNEL_ID = '1366718740351418400';
const ARCHIVE_CATEGORY_ID = '1367727269795069962';
const CHANNEL_INACTIVITY_LIMIT_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const userSelections = new Map();

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function generateCollabButtonMessage() {
  return {
    content: `🤝 **Propose a Collaboration**\nHave a cool idea involving multiple clubs? Submit your idea below. We'll notify the relevant clubs and set up a planning space once everyone’s on board.`,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('collabthread:open')
          .setLabel('📤 Submit Collaboration Idea')
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

async function execute(interaction) {
  if (interaction.customId === 'collabthread:open') {
    const clubRoles = (await fetchClubRoles()).sort((a, b) => a.label.localeCompare(b.label));
    const roleChunks = chunkArray(clubRoles, 25);
    const rows = roleChunks.map((chunk, index) =>
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`collabthread:roles:${index}`)
          .setPlaceholder(`Select club roles ${index + 1}`)
          .setMinValues(0)
          .setMaxValues(5)
          .addOptions(chunk.map(r => ({ label: r.label, value: r.value })))
      )
    );

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('collabthread:confirm')
          .setLabel('✅ Confirm Selection')
          .setStyle(ButtonStyle.Success)
      )
    );

    await interaction.reply({
      content: 'Select the clubs you want to involve, then click Confirm:',
      components: rows,
      ephemeral: true
    });
  } else if (interaction.customId.startsWith('collabthread:roles:')) {
    const existing = userSelections.get(interaction.user.id) || [];
    userSelections.set(interaction.user.id, [...new Set([...existing, ...interaction.values])]);

    await interaction.reply({
      content: '✅ Roles added. Click confirm when ready.',
      ephemeral: true
    });
  } else if (interaction.customId === 'collabthread:confirm') {
  const selectedValues = userSelections.get(interaction.user.id) || [];
  if (selectedValues.length === 0) {
    return await interaction.reply({ content: '⚠️ No roles selected.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`collabthread:modal:${selectedValues.join(',')}`)
    .setTitle('Submit Collaboration Idea');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Title or Name of the Idea')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Brief description of the idea')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput)
  );

  await interaction.showModal(modal);
}

else if (interaction.customId.startsWith('collabthread:modal:')) {
  const title = interaction.fields.getTextInputValue('title');
  const description = interaction.fields.getTextInputValue('description');
  const selectedKeys = interaction.customId.split(':')[2].split(',');
  const { user } = interaction;

  const { error } = await supabase.from('collab_proposals').insert({
    message_id: 'TEMP',
    title,
    description,
    user_id: user.id,
    roles: selectedKeys,
    timestamp: new Date().toISOString(),
    channel_created: false,
    archived: false
  });

  if (error) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ DB error.', ephemeral: true });
    }
    return;
  }

  const clubRoles = await fetchClubRoles();
  const selectedRoles = clubRoles.filter(role => selectedKeys.includes(role.value));
  const hubChannel = await interaction.guild.channels.fetch(HUB_CHANNEL_ID).catch(() => null);

  if (!hubChannel?.isTextBased?.()) {
    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply({
        content: '❌ Collaboration hub channel is invalid or inaccessible.',
        flags: 64,
      });
    }
    return;
  }

  const mentionList = selectedRoles.map(r => `<@&${r.id}>`).join(', ');

  const message = await hubChannel.send({
    content: `📢 **${title}** by <@${user.id}>\n> 💡 _${description}_\n> 📣 Clubs invited: ${mentionList}\n> ✅ React with ✅ to show interest.`
  });

  await message.react('✅');
  await supabase.from('collab_proposals')
    .update({ message_id: message.id })
    .match({ user_id: user.id, description });

  userSelections.delete(user.id);

  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: '✅ Collaboration proposal submitted!', ephemeral: true });
  }
}
}

// checkReactions function remains unchanged

async function checkReactions(client) {
  const { data: proposals } = await supabase.from('collab_proposals').select('*');
  if (!proposals) return;

  for (const proposal of proposals) {
    if (proposal.channel_created && proposal.archived) continue;

    const channel = await client.channels.fetch(HUB_CHANNEL_ID);
    const message = await channel.messages.fetch(proposal.message_id).catch(() => null);

    if (!message) {
      await supabase.from('collab_proposals').delete().eq('message_id', proposal.message_id);
      continue;
    }

    if (Date.now() - new Date(proposal.timestamp).getTime() > COLLAB_POST_LIFETIME_MS) {
      await message.delete().catch(() => {});
      await supabase.from('collab_proposals').delete().eq('message_id', proposal.message_id);
      continue;
    }

    if (!proposal.channel_created) {
      const reactions = await message.reactions.resolve('✅')?.users.fetch();
      const acknowledgedRoles = new Set();

      for (const user of reactions?.values() || []) {
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) continue;

        const clubRoles = await fetchClubRoles();
        const relevantRoleIds = proposal.roles.map(val => clubRoles.find(r => r.value === val)?.id);
        for (const roleId of relevantRoleIds) {
          if (member.roles.cache.has(roleId)) acknowledgedRoles.add(roleId);
        }
      }

      const clubRoles = await fetchClubRoles();
      const allRoleIds = proposal.roles.map(val => clubRoles.find(r => r.value === val)?.id);
      if (allRoleIds.every(id => acknowledgedRoles.has(id))) {
        const overwrites = allRoleIds.map(id => ({
          id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }));
        overwrites.push({
          id: message.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        });

        const newChannel = await message.guild.channels.create({
          name: `collab-${proposal.user_id}-${Date.now().toString().slice(-4)}`,
          type: ChannelType.GuildText,
          parent: COLLAB_CATEGORY_ID,
          permissionOverwrites: overwrites,
        });

        const clubRolesMap = await fetchClubRoles();
        const matchedRoles = proposal.roles.map(val => clubRolesMap.find(r => r.value === val)).filter(Boolean);
        const mentions = matchedRoles.map(r => `<@&${r.id}>`).join(', ');

        const summary = `
        📌 **Collaboration Channel Created**
        > - 🧠 **Idea**: ${proposal.description}
        > - 👥 **Invited Clubs**: ${mentions}

        If you would like to change the name of this channel, the user who posted the collaboration idea can use the \`/rename-collab\` command.`;
        const pinMessage = await newChannel.send(summary);
        await pinMessage.pin().catch(() => {});

        await supabase.from('collab_proposals').update({ channel_created: true, channel_id: newChannel.id }).eq('message_id', proposal.message_id);
      }
    }

    if (proposal.channel_created && proposal.channel_id) {
      const collabChannel = await client.channels.fetch(proposal.channel_id).catch(() => null);
      if (collabChannel && collabChannel.messages) {
        const messages = await collabChannel.messages.fetch({ limit: 1 });
        const lastMessage = messages.first();
        const lastActivity = lastMessage ? lastMessage.createdTimestamp : 0;

        if (Date.now() - lastActivity > CHANNEL_INACTIVITY_LIMIT_MS) {
          await collabChannel.setParent(ARCHIVE_CATEGORY_ID).catch(() => {});
          await collabChannel.setName(`archived-${collabChannel.name}`).catch(() => {});
          await supabase.from('collab_proposals').update({ archived: true }).eq('channel_id', proposal.channel_id);
        }
      }
    }
  }
}

module.exports = {
  customId: 'collabthread',
  generateCollabButtonMessage,
  execute,
  checkReactions
};
