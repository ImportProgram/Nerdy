const {
    Client,
    Intents,
    MessageEmbed,
    MessageAttachment,
} = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const { REST } = require("@discordjs/rest");
const mysql = require('mysql2/promise');
const bluebird = require('bluebird');



//Create some global constants for values and for objects
const { token, guildId, version } = require("./config.json");



let commands = {};

const updateSlashCommand = (command) =>{ 
    
    const guild = client.guilds.cache.get(guildId);
    //Update the slash commands to the guild
    guild.commands.create(command.toJSON());
}


//Ready event for DiscordJS
client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);


    const mysql = require('mysql2');
    // create the pool
    const pool = mysql.createPool({host:'localhost', user: 'ip', password:'12345', database: 'nerdy'});
    // now get a Promise wrapped instance of that pool
    const promisePool = pool.promise();
    // query database using promises
    //const [rows,fields] = await promisePool.query("SELECT 1");

    const fg = require('fast-glob');
    const entries = await fg(['./modules/**.js'], { dot: false });

    
    for (const entry of entries) {
        const command = require(`${entry}`);
        commands[command.command.name] = {
            name: command,
            command: command
        }
        command.onStart(client, promisePool, guildId, version);

        updateSlashCommand(command.command)
    }
    /*for (const module in commands) {
        commands[module].command.finishedStart()
    }*/
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (commands[interaction.commandName] == null) return

	const module = commands[interaction.commandName]
    
	try {
		await module.command.onCommand(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
})


client.login(token);
