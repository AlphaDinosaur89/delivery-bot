const { Client, IntentsBitField, SlashCommandBuilder, REST, Routes, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const rest = new REST({ version: '10' }).setToken(config.token);

const commands = [
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('shop parent command')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('(admin only) add an item to the shop.')
                .addStringOption(option => option.setName('name').setDescription('name').setRequired(true))
                .addStringOption(option => option.setName('price').setDescription('price').setRequired(true))
                .addStringOption(option => option.setName('image').setDescription('image').setRequired(true))
                .addChannelOption(option => option.setName('channel').setDescription('channel').setRequired(true))
                .addStringOption(option => option.setName('x').setDescription('x').setRequired(true))
                .addStringOption(option => option.setName('y').setDescription('y').setRequired(true))
                .addStringOption(option => option.setName('z').setDescription('z').setRequired(true)))
    .addSubcommand(subcommand =>
            subcommand
                .setName('re-add')
                .setDescription('(admin only) re-add an item to the shop.')),

    new SlashCommandBuilder()
        .setName('nocooldown')
        .setDescription('noCooldown parent command')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('(admin only) add someone to the no cooldown list')
                .addUserOption(option => option.setName('name').setDescription('name').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('(admin only) remove someone from the no cooldown list')
                .addUserOption(option => option.setName('name').setDescription('name').setRequired(true))),
    new SlashCommandBuilder()
        .setName('banner')
        .setDescription('set a banner for the bot')
        .addAttachmentOption(option => option.setName('attachment').setDescription('the image (png or gif)').setRequired(true)),
].map(command => command.toJSON());


(async () => {
  try {
      console.log('Started refreshing application (/) commands.');

      await rest.put(
          Routes.applicationCommands(config.clientId),
          { body: commands },
      );

      console.log('Successfully reloaded application (/) commands globally.');
  } catch (error) {
      console.error(error);
  }
})();