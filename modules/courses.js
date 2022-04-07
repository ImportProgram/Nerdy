const { SlashCommandBuilder } = require("@discordjs/builders");
const { Permissions, MessageEmbed } = require('discord.js');


module.exports = {
    command: new SlashCommandBuilder()
        .setName("courses")
        .setDescription("Allow for actions in a course channel").addSubcommand((subcommand) =>
            subcommand
                .setName("bind")
                .setDescription(
                    "Bind the course to this channel."
                )
        )
    ,
    onStart(client, pool, guildId, version) {
        
    },
    finishedStart() {

    },
    onShutdown() {
        
    },
    onCommand(interaction) {
        
    },
    getModule() {
      
    }
}