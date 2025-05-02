// data/clubRoles.js
const { supabase } = require('../utils/supabaseClient');

async function fetchClubRoles() {
  const { data, error } = await supabase
    .from('club_roles')
    .select('name, value, discord_role_id');

  if (error) throw error;
  return data.map(r => ({
    label: r.name,
    value: r.value,
    id: r.discord_role_id,
  }));
}

module.exports = { fetchClubRoles };