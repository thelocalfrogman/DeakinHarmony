# Harmony Bot Documentation

Harmony Bot is a collaborative Discord bot designed to streamline inter-club communication, automate collaboration space setup, and reduce administrative burden across Deakin University's club Discord servers.

## To Do
- Implement a / command for admins to easily add new roles to the Supabase DB

## 📦 Features

### 1. `/clubroom` Command

Allows a user to create a private text channel (clubroom) for selected club roles.

* **Inputs:**
  * `name` (required): Desired name of the private channel.
  * `clubs` (required): Comma-separated list of club acronyms, role mentions, or exact role names.

* **Logic:**
  * Matches inputs against a unified list of known club roles stored in Supabase.
  * Creates a channel with permissions for only the selected roles.
  * Sends a welcome message and tags all invited roles.

### 2. Clubroom Button Interface

Displayed in a designated channel with a persistent message.

* **User Flow:**

  * Users click a button to start the process.
  * Select roles via multiple dropdown menus (up to 25 roles, 5 per dropdown).
  * Click ✅ to confirm selections.
  * Enter a name in a popup modal.
  * Bot creates the private channel, notifies roles, and posts a pinned welcome.

* **Fallback:** Users can use the `/clubroom` command if dropdowns are too limiting.

### 3. `/collabthread` Command

Slash command version of collaboration idea submission.

* **Inputs:**
  * `idea` (required): Description of the collaboration.
  * `clubs` (required): Comma-separated club acronyms or role mentions.

* **Logic:**
  * Matches club identifiers against Supabase roles.
  * Posts idea in the `#collaboration-hub` channel.
  * Tags all invited roles.
  * Waits for ✅ reaction from at least one member of each invited club.
  * Automatically creates a private planning channel if all clubs acknowledge.

### 4. Collaboration Button Interface

Displayed in `#collaboration-hub`.

* **User Flow:**
  * User clicks a button to begin.
  * Select roles using dropdowns (same as clubroom).
  * Confirm → enter idea in modal popup.
  * Bot posts formatted proposal and adds ✅ reaction.

### 5. Reaction-Based Channel Creation

Both slash and button proposals store metadata in Supabase.

* Every minute, the bot checks all pending collaboration proposals:

  * If all selected roles have acknowledged via ✅ reaction:
    * A new channel is created in the collab category.
    * Roles are granted access.
    * Summary is posted and pinned.
    * Supabase is updated with the channel ID.

### 6. Auto-Archiving Mechanism

Inactive collaboration channels are automatically archived.

* **Logic:**
  * If no messages are sent for 14 days:
    * Channel is renamed with `archived-` prefix.
    * Moved to archive category.
    * Supabase entry updated with `archived = true`.

### 7. `/rename-collab` Command

Allows a user to rename one of their active collaboration channels.

* Presents a dropdown of active (non-archived) channels the user proposed.
* Modal input used to collect the new name.
* Channel is renamed and a pinned message is posted to confirm.

## 🧠 Role Lookup System

All club roles are stored in Supabase in a single `club_roles` table with:

* `label`: Full name of the club
* `value`: Acronym used for slash commands
* `id`: Discord role ID

This list is fetched and cached for:

* Dropdown menus
* Role matching in slash commands
* Confirmation messages

## 🔁 Persistent Proposal Storage

All collaboration proposals are stored in Supabase in `collab_proposals`:

* `user_id`
* `description`
* `roles[]`
* `timestamp`
* `message_id`
* `channel_id`
* `channel_created`
* `archived`

These are referenced for:

* Auto-archiving
* Reaction checks
* Rename command
