//Import all of the modules
const {
  Client,
  Intents,
  MessageEmbed,
  MessageAttachment,
} = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const sqlite3 = require("sqlite3").verbose();
const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

//Create some global constants for values and for objects
const { token, guildId, version } = require("./config.json");
const db = new sqlite3.Database("csis.db");
const canvas = new ChartJSNodeCanvas({
  width: 1000,
  height: 500,
  backgroundColour: "lightgray",
  color: "white",
});

//Create the tables in the SQL lite db if not already exist.
db.run(
  `CREATE TABLE IF NOT EXISTS panda (id integer primary key, uuid varchar(100), server varchar(50), type varchar(20), side int, entree INT, grubhub BOOLEAN, date DATE, rating FLOAT )`
);

//A promise/async function for querying the database
function dbAll(query, params) {
  return new Promise(function (resolve, reject) {
    if (params == undefined) params = [];

    db.all(query, params, function (err, rows) {
      if (err) reject("Read error: " + err.message);
      else {
        resolve(rows);
      }
    });
  });
}

//The function which updates all of the slash commands in the guild
async function updateCommands(client) {
  //A list of servers/employees for the autofill feature
  let servers = [["UNKNOWN", "UNKNOWN"]];
  //Find them from the server disinctly
  const rows = await dbAll("SELECT DISTINCT server FROM panda");
  //Push them all to the list in the name, value specification from Discord.JS
  for (let i in rows) {
    const row = rows[i];
    servers.push([row.server.toUpperCase(), row.server.toUpperCase()]);
  }

  //Create a new command building for all of the commands
  const data = new SlashCommandBuilder()
    .setName("panda")
    .setDescription("Panda Express Rating/Lookup")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rate")
        .setDescription(
          "Rate your panda experience! Employees are autofilled. "
        )
        .addStringOption((option) =>
          option
            .setName("employee")
            .setDescription("Name of the employee who served you.")
            .setRequired(true)
            .addChoices(servers)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("What meal type did you get?")
            .setRequired(true)
            .addChoice("BOWL", "BOWL")
            .addChoice("PLATE", "PLATE")
            .addChoice("BIGGER PLATE", "BIGGER PLATE")
        )
        .addNumberOption((option) =>
          option
            .setName("side")
            .setDescription("Quality of side 1-100.")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("entree")
            .setDescription("Quality of the entree 1-100.")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("grubhub")
            .setDescription("Did you use GrubHub?")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ratenew")
        .setDescription(
          "Rate your panda experience! Allows for a new employee to be added."
        )
        .addStringOption((option) =>
          option
            .setName("employee")
            .setDescription("Name of the employee who served you.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("What meal type did you get?")
            .setRequired(true)
            .addChoice("BOWL", "BOWL")
            .addChoice("PLATE", "PLATE")
            .addChoice("BIGGER PLATE", "BIGGER PLATE")
        )
        .addNumberOption((option) =>
          option
            .setName("side")
            .setDescription("Quality of side 1-100.")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("entree")
            .setDescription("Quality of the entree 1-100.")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("grubhub")
            .setDescription("Did you use GrubHub?")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pastweek")
        .setDescription("Graph of daily average rating from the past week.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("predict").setDescription("Predict the next best day.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("employees").setDescription("List all the employees")
    );

  //Find the current guild that is being used
  const guild = client.guilds.cache.get(guildId);

  //Update the slash commands to the guild
  guild.commands.create(data.toJSON());
}

//Ready event for DiscordJS
client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  //client.api.applications(client.user.id).commands('941503942725083136').delete()
  const rest = new REST({ version: "9" }).setToken(token);
  await updateCommands(client);
});

//Slash Command Interaction Event
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "panda") {
    let db = new sqlite3.Database("csis.db");

    if (
      interaction.options.getSubcommand() == "rate" ||
      interaction.options.getSubcommand() == "ratenew"
    ) {
      const server = interaction.options.getString("employee");
      const type = interaction.options.getString("type");
      const side = interaction.options.getNumber("side");
      const entree = interaction.options.getNumber("entree");
      const grubhub = interaction.options.getBoolean("grubhub");

      //Based on the usual amount given
      let entreeWeight = 0.7;
      if (type.toString() == "BOWL") {
        entreeWeight = 0.35;
      } else if (type.toString() == "PLATE") {
        entreeWeight = 0.5;
      }

      const sideWeight = 1 - entreeWeight;

      const rating = side * sideWeight + entree * entreeWeight;

      const embed = new MessageEmbed()
        .setTitle("Panda Express Rating")
        .setThumbnail("https://i.imgur.com/ogkfmbY.jpeg")
        .addFields(
          { name: "Employee", value: server.toString() },
          { name: "Meal Type", value: type.toString() },
          { name: "Side rating", value: side.toString() + "%" },
          { name: "Entrée rating", value: entree.toString() + "%" },
          {
            name: "Used GrubHub?",
            value: grubhub == true ? ":white_check_mark: (yes)" : ":x: (no)",
          },
          { name: "Calculated Rating: ", value: rating.toFixed(3) + "%" }
        )
        .setFooter({ text: `(Version ${version}) - ${new Date()}` });

      // insert one row into the langs table
      db.run(
        `INSERT INTO panda(server,uuid,type,side,entree,grubhub,date,rating) VALUES(?,?,?,?,?,?, DateTime('now'), ?)`,
        [server.toLowerCase(), interaction.user.id, type, side, entree, grubhub, rating],
        function (err) {
          if (err) {
            return console.log(err.message);
          }
          // get the last insert id
          console.log(`A row has been inserted with rowid ${this.lastID}`);
        }
      );

      await interaction.reply({ embeds: [embed] });
      updateCommands(client);
    }

    if (interaction.options.getSubcommand() == "pastweek") {
      //Get all of the averages for the past 7 days (including today)
      //And if there is no data for that day, then ignore the day
      const rows = await dbAll(`
      WITH week(date) AS (
        SELECT date('now', '-6 day') 
        UNION ALL 
        SELECT date(date, '+1 day') 
        FROM week 
        WHERE date <= date('now', '-1 day') 
      )
      SELECT strftime('%m/%d', w.date) date, CASE WHEN rating IS NULL THEN 0 ELSE AVG(p.rating) END AS rating 
      FROM week w LEFT JOIN panda p
      ON date(p.date) = w.date
      GROUP BY w.date
      ORDER BY w.date ASC;
      `);

      //List of dates and ratings for the chart
      let dates = [];
      let ratings = [];

      //Split the data up for the chart
      for (let i in rows) {
        const row = rows[i];
        dates.push(row.date.toString() + "   " + row.rating.toFixed(3).toString() + "%");
        ratings.push(row.rating);
      }

      //Configure the chart for the data from the SQL lite database
      const config = {
        type: "bar",
        data: {
          labels: dates,
          backgroundColor: "white",
          datasets: [
            {
              label: "Average Rating of Panda Per Day",
              data: ratings,
              backgroundColor: "#7289d9",
            },
          ],
        },
      };

      //Make the image as a buffer
      const image = await canvas.renderToBuffer(config);

      //Ingore the ineraction/slash command
      await interaction.deferReply();
      await interaction.deleteReply();
      //Send a new channel message with the image (from the orginal channel the slash command had)
      await interaction.channel.send({
        content: `Average Rating of Panda Per Day`,
        files: [{ attachment: image }],
      });
    }

    //List all of the employees
    if (interaction.options.getSubcommand() == "employees") {
      const all = await dbAll(
        "SELECT MIN(id) AS id, AVG(rating) AS rating, server FROM panda GROUP BY server ORDER BY rating DESC"
      );
      const embed = new MessageEmbed()
        .setTitle("Panda Express Employee List")
        .setThumbnail("https://i.imgur.com/ogkfmbY.jpeg")
        .setFooter({ text: `${all.length}/25` });

      console.log(all);

      if (all.length == 0) {
        embed.setDescription("No employees found");
      }
      for (let i in all) {
        const row = all[i];
        embed.addField(row.server.toUpperCase(), row.rating.toString() + "%");
      }
      await interaction.reply({ embeds: [embed] });
    }


    if (interaction.options.getSubcommand() == "predict") {
      await interaction.reply("Prediction currently not implemented as data is not accurate for a regression analysis.");
    }
  }
});

//Login the bot client and start the bot
client.login(token);
