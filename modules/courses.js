//Discord
const { SlashCommandBuilder } = require("@discordjs/builders");
const { sub } = require("date-fns");
const { Permissions, MessageEmbed } = require('discord.js');

//Fetching
const fetchCookie = require('fetch-cookie')
const nodeFetch = require('node-fetch')

//Parsing
const JSSoup = require('jssoup').default;


class Course {
    constructor(client, pool, guildId, version) {
        this.client = client
        this.pool = pool
        this.version = version;
        this.guildId = guildId
        this.crons = {}
        this.start()
    }
    async start() {

    }
    async bindChannel(interaction) {
        const id = interaction.channelId

        const department = interaction.options.getString("department");
        const courseId = interaction.options.getString("id");
        const role = interaction.options.getRole("role");


        console.log(department)
        console.log(courseId)
        console.log(role)

        const embed = new MessageEmbed()
        .setTitle("Course Added")
        .setDescription("Added course to the course list.")
        .addFields(
            {name: 'Department', value: department.toString()},
            {name: 'Course', value: courseId.toString()},
            {name: 'Role', value: role.name.toString()}
        )
        .setTimestamp()
        .setColor('#00FF00')
        .setFooter({ text: `Nerdy ${this.version}` })
        const [rows, fields] = await pool.query(`SELECT * FROM  course_channels WHERE id=`, []);
        let subjects = []
        for (let row of rows) {
            subjects.push(row.code)
        }
        await this.pool.execute("INSERT INTO course_channels VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE id = ?", [
            id,
            department,
            courseId,
            role.id,
            id
        ])
        interaction.channel.send({embeds:[embed]})
    }
    async onCommand(interaction) {
        if (interaction.options.getSubcommand() == "bind") {
            interaction.member = interaction.guild.members.cache.get(
                interaction.user.id
            );
            if (interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
                this.bindChannel(interaction)
                await interaction.deferReply();
                await interaction.deleteReply();
                return
            }
        } 
        return await interaction.reply({ content: ':hammer: Invalid Command!', ephemeral: true });
    }
}

let course;






module.exports = {
    async getSlashCommand(client, pool) {
        const fetchCourseSubjects = async () => {

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
                await pool.execute("INSERT INTO course_subjects VALUES (?,?) ON DUPLICATE KEY UPDATE code = ?", [subject.Code, subject.Description, subject.Code])
            }
        }
        const getCourseSubjects = async () => {
            const [rows, fields] = await pool.query(`SELECT * FROM  course_subjects`);
            let subjects = []
            for (let row of rows) {
                subjects.push(row.code)
            }
            return subjects
        }




        await fetchCourseSubjects()
        return new SlashCommandBuilder()
            .setName("course")
            .setDescription("Allow for actions in a course channel").addSubcommand((subcommand) =>
                subcommand
                    .setName("bind")
                    .setDescription(
                        "Bind the course to this channel."
                    ).addStringOption((option) =>
                        option
                            .setName("department")
                            .setDescription("Deparment for the course.")
                            .setRequired(true)
                    ).addStringOption((option) =>
                        option
                            .setName("id")
                            .setDescription("Course identifier. May include special characters.")
                            .setRequired(true)
                    ).addRoleOption((option) =>
                        option
                            .setName("role")
                            .setDescription("Bind a role to this channel, but also to the course.")
                            .setRequired(true)
                    )

            )
    },
    onStart(client, pool, guildId, version) {
        course = new Course(client, pool, guildId, version)
    },
    finishedStart() {

    },
    onShutdown() {
        course.onShutdown()
    },
    onCommand(interaction) {
        course.onCommand(interaction)
    },
    getModule() {
        return course;
    }
}