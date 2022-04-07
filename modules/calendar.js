const { SlashCommandBuilder } = require("@discordjs/builders");
const { Permissions, MessageEmbed } = require('discord.js');

//Fetching
const fetchCookie = require('fetch-cookie')
const nodeFetch = require('node-fetch')

//Parsing
const JSSoup = require('jssoup').default;
const { read } = require('feed-reader')
let Parser = require('rss-parser');
let parser = new Parser();
const striptags = require('striptags');

//Dates
const formatISO9075 = require('date-fns/formatISO9075')
const parseISO = require('date-fns/parseISO')
const sub = require('date-fns/sub')
const add = require('date-fns/add')
const format = require('date-fns/format')
const isThisSecond = require('date-fns/isThisSecond')
const isBefore = require('date-fns/isBefore');
const eachDayOfInterval = require('date-fns/eachDayOfInterval')

//Schedules
const Cron = require("croner");

const ACADEMIC_COLOR = '#6bcd3a'
const PAYMENT_COLOR = '#ff9cff'
const REGISTRATION_COLOR = '#95e5ff'

//DEFAULTS
const CALENDARS = {
    REGISTRATION: {
        rss: 'https://25livepub.collegenet.com/calendars/student-important-dates.xml?mixin=22055%2c22052',
        color: '#95e5ff',
        table: 'calendar_registraction_dates',
        title: 'SVSU Registration Dates',
        notify: {
            buttonName: 'Registration',
            enabled: true
        }
    },
    PAYMENTS: {
        rss: 'https://25livepub.collegenet.com/calendars/student-important-dates.xml?mixin=22053',
        color: '#ff9cff',
        table: 'calendar_payment_dates',
        title: 'SVSU Payments Dates',
        notify: {
            buttonName: 'Payment',
            enabled: true,
            prewarn: 7,
        }
    },
    ACADEMIC: {
        rss: 'https://25livepub.collegenet.com/calendars/student-important-dates.xml?mixin=378402',
        color: '#6bcd3a',
        table: 'calendar_academic_dates',
        title: 'SVSU Academic Dates',
        notify: {
            buttonName: 'Academic',
            enabled: true,
        }
    },
}


class Calendar {
    constructor(client, pool, guildId, version) {
        this.client = client
        this.pool = pool
        this.version = version;
        this.guildId = guildId
        this.crons = {}
        this.start()
    }
    async start() {
        //On boot start the process
        await this.initalizeChannels()

        //Ref to class
        const _this = this

        //Update the list at 12AM
        const job = Cron('0 0 0 * * *', (self) => {
            _this.initalizeChannels()
        });
    }
    async initalizeChannels() {
        //await this.getCalendarDates()
        console.log("[Nerdy] Fetched Calendar Dates...")
    
        this.createRoles()

        //Loop all channels
        const [rows,fields] = await this.pool.query(`SELECT * FROM  calendar_channels`);
        for (let row of rows) {
            this.initalizeCalendar(row.messageId, row.id)
        }
    }
    async initalizeCalendar(messageId, channelId) {
        //Get the start date.
        const start = sub(new Date(), {days: 30})
        //Get the end date
        const end = add(new Date(), {days: 30});

        //Simple function to create an embed
        const createEmbed = (name, color, fields) => {
            const embed = new MessageEmbed()
                .setColor(color)
                .setTitle(name)
                .setFooter({ text: `Nerdy ${this.version}`  })
                .setTimestamp();
            for (let field of fields) {
                embed.addField(field.name, field.value)
            }
            return embed
        }
        //List of all embeds
        let embeds = []

        //Loop through all CALENDARS defined
        for (const i in CALENDARS) {
            const calendar = CALENDARS[i]
            const [rows,fields] = await this.pool.query(`SELECT DATE(published) as date, title, content, startHour, endHour FROM ${calendar.table} WHERE published >= ? AND published <= ? ORDER BY published ASC`, [
                formatISO9075(start),
                formatISO9075(end)
            ]);

            let embedRows = {}
            let extraDates = {}
            let textCount = 0
            for (let row of rows) {

                //Check if the text count for the current date is over 850 length, because a max
                //discord MessageEmbed field is limited to 1024.
                //Also an entire messaage is limited to 6000
                if (textCount > 850) {
                    if (extraDates[row.date]== null) {
                        extraDates[row.date]=0
                    }
                    extraDates[row.date]++;
                    continue
                }
                if (embedRows[row.date] == null) {1
                    embedRows[row.date] = { name: format(row.date, 'MMMM dd, yyyy'), value: [""] }
                    textCount += format(row.date, 'MMMM dd, yyyy').length //Get start length of the date too
                }
                //Get the content
                const body = `${row.title} at **${row.startHour}** ${row.endHour ? "**- " + row.endHour +"**": ""}\n\`\`\`${row.content}\`\`\``
                embedRows[row.date].value.push(body)
                textCount +=body.length
            } 
            //Now append the extra dates and values together.
            let outEmbedRows = []
            for (let row in embedRows) {
                const string = embedRows[row].value.join("")
                let extra = ""
                if (extraDates[row] != null) {
                    extra = `\n_And ${extraDates[row]} more events/important dates..._`
                }
                embedRows[row].value = "" + string.toString() + extra
                outEmbedRows.push(embedRows[row])
            }
 
            //If we have nothing for events, tell the user something useful.
            if (outEmbedRows.length == 0) {
                outEmbedRows.push({name: "No events/important dates!", value: ":exploding_head::ok_hand:"})
            }

            //Add to the list of embeds.
            embeds.push(createEmbed(calendar.title, calendar.color, outEmbedRows))
        } 

        //Update the current message within the current guild location.
        const guild = this.client.guilds.cache.get(this.guildId)
        const channel = guild.channels.cache.get(channelId)
        const message = await channel.messages.fetch(messageId)
        message.edit({ embeds})
    }
    async bindChannel(interaction) {
        const id = interaction.channelId
        let channel = interaction.guild.channels.cache.get(id)
        if (channel != null) {

            //Send the new message....
            const message = await channel.send("Loading...");

            await this.pool.execute("INSERT INTO calendar_channels (id, messageId) VALUES (?,?) ON DUPLICATE KEY UPDATE id = ?", [
                id,
                message.id,
                id
            ])
            this.initalizeCalendar(message.id, id)

            return await interaction.reply({ content: 'Binding the calendar to this channel...', ephemeral: true });
        }
        return await interaction.reply({ content: 'Failed to bind the calendar to this channel...', ephemeral: true });
    }
    async getCalendarDates() {
        for (const i in CALENDARS) {
            const calendar = CALENDARS[i]
            //const response = await read(calendar.rss)
            const response  = await parser.parseURL(calendar.rss)
            for (const entry of response.items) {
                
                const items = entry.content.split("<br/><br/>")
                const dates = items[0].split("&nbsp;&ndash;&nbsp;")
                let endHour = dates[1]
                const fullDate = dates[0].split(",")
                let startHour = fullDate[fullDate.length -1]
                let content = striptags(items[1].trim())
                const id = entry.id
                console.log(content)
                if (typeof startHour === 'undefined') {
                    startHour = null
                } else {
                    startHour = startHour.trim()
                }
                if (typeof endHour === 'undefined') {
                    endHour = null
                } else {
                    endHour = endHour.trim()
                }
                if (content.includes('Event Name:&nbsp;')) {
                    let event = content.split('Event Name:&nbsp;')
                    event = event[1].split('Event State:')
                    content = event[0].trim()
                }
                let notified = false
         
                if (isBefore(parseISO(entry.published), Date.now())) notified = true;
                await this.pool.execute(`INSERT INTO ${calendar.table} VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id = ?`, [
                    id,
                    formatISO9075(parseISO(entry.isoDate)),
                    entry.title,
                    content,
                    entry.link,
                    notified,
                    startHour,
                    endHour,
                    id
                ])
            }
        }
    }
    async getCourseSubjects() {

        //Start fetching but with cookies
        const fetch = fetchCookie(nodeFetch)


        //Now fetch the main site for the f@ck!ng awful token that's embedded in the site. 
        //Thankfully JSSoup makes this really easy
        let response = await fetch('https://colss-prod.ec.svsu.edu/Student/courses/')
        let data = await response.text();
        let soup = new JSSoup(data)
        const token = soup.find('body').nextElement;


        //https://colss-prod.ec.svsu.edu/Student/courses/
        response = await fetch("https://colss-prod.ec.svsu.edu/Student/Courses/GetCatalogAdvancedSearchAsync", {
            "headers": {
                "__requestverificationtoken": token.attrs.value,
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json, charset=utf-8",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sec-gpc": "1",
                "x-requested-with": "XMLHttpRequest",
                "Referer": "https://colss-prod.ec.svsu.edu/Student/courses/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        let json = await response.json()

        for (const subject of json.Subjects) {
            await this.pool.execute("INSERT INTO calendar_subjects VALUES (?,?) ON DUPLICATE KEY UPDATE code = ?", [subject.Code, subject.Description, subject.Code])
        }
    }
    onShutdown() {

    }
    async onCommand(interaction) {
        if (interaction.options.getSubcommand() == "bind") {
            interaction.member = interaction.guild.members.cache.get(
                interaction.user.id
            );
            if (interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
                return this.bindChannel(interaction)
            }
            return await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            return await interaction.reply({ content: 'Invalid Command', ephemeral: true });
        }
    }
}


let calendar;
module.exports = {
    command: new SlashCommandBuilder()
        .setName("calendar")
        .setDescription("Allow for an SVSU calendar to be added to the channel.").addSubcommand((subcommand) =>
            subcommand
                .setName("bind")
                .setDescription(
                    "Bind the calendar to this channel."
                )
        )
    ,
    onStart(client, pool, guildId, version) {
        calendar = new Calendar(client, pool, guildId, version)
    },
    finishedStart() {

    },
    onShutdown() {
        calendar.onShutdown()
    },
    onCommand(interaction) {
        calendar.onCommand(interaction)
    },
    getModule() {
        return calendar;
    }
}