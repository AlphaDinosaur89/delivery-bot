const { Client, IntentsBitField, SlashCommandBuilder, DataResolver, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, time } = require('discord.js');
const fs = require('fs');
const internal = require('stream');
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalNear } = require('mineflayer-pathfinder').goals
const Vec3 = require('vec3');
const path = require('path');
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
                    .setName('add-mystery')
                    .setDescription('(admin only) add the mystery item to the shop.'))
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


const mainBot = () => {
    
  const bot = mineflayer.createBot({
    host: 'localhost',
    port: '59463',
    version: '1.19.3',
    username: config.username,
    skipValidation: true,
  });
    
  function order(username) {
      if (!config.whitelist.includes(username.toString())) {
          bot.chat(`/w ${username.toString()} you are not on the whitelist, ask the bot owner to add you.`);
          return;
      }
      if (!commandCooldowns[username.toString()] || Date.now() - commandCooldowns[username.toString()] >= 15 * 60 * 1000) {
        bot.chat(`/w ${username.toString()} i am already delivering a kit or on tpa cooldown, you have been added to the queue.`);
              /*
              if (isServerOnCooldown()) {
                  if (!bot.queue.includes(username.toString())) {
                      bot.queue.push(username.toString());
                  } else {
                  bot.chat(`/w ${username.toString()} i am already delivering a kit, you are already in the queue.`);
                  }
              }
              */
          } else {
              bot.chat(`/w ${username.toString()} accept the tpa request to receive your kit.`);

              new Delivery(arg, username.toString(), null, minecraft=true);
              updateServerCooldown();
          }
      } else {
          const remainingTime = Math.ceil((15 * 60 * 1000 - (Date.now() - commandCooldowns[username.toString()])) / 1000);

          bot.chat(`/w ${username.toString()} you are on cooldown, you have ${format(remainingTime)} left until you can order again.`);
      }
  }

  bot.queue = []
  bot.loadPlugin(pathfinder);
  const defaultMove = new Movements(bot);
  defaultMove.canDig = false;
  defaultMove.allowSprinting = true;
  
  // Code by fit.mc (AlphaDino) (you can remove this)
  
  bot.on("whisper", (username, message) => {
    let splitmsg = message.toString().split(' ');
    
    // check if there is command and argument
    if (splitmsg.length !== 2) return;
    let arg = splitmsg[1];
    let command = splitmsg[0].substring(1);
    
    // check if its indeed a command with ! prefix
    if (!message.toString().startsWith('!')) return;
    console.log(username.toString())
    
    switch (command) {
      case "order":
        order(username);
        break;
    }
  });
  
  bot.on('physicTick', () => {
    if (!isServerOnCooldown() && bot.queue.length > 0) {
        order(bot.queue[0]);
        bot.queue = bot.queue.slice(1);
    }
  });

  bot.on("message", (message) => {
    log(message.toAnsi())
    if (message.toString() === config.loginMessage) {
      bot.chat('/login ' + config.password);
    };
    if (message.toString().includes('has requested to teleport to you. Type /tpaccept to accept it.')) {
        const args = message.toString().split(" ");
        const username = args[0];
        if (fs.readFileSync('./data/tpaWhitelist.txt').includes(username)) {
            bot.chat('/tpaccept')
        }
    }
  });

  bot.on("error", (err) => {
    console.log(err);
    bot.end();

  });

  bot.on("kicked", (err) => {
    console.log(err);
    bot.end();
  });

  bot.on("end", () => {
    client.destroy();
    bot.removeAllListeners();
    setTimeout(mainBot, 5000);
  });

const commandCooldowns = {};
const globalCooldown = 30 * 630000;
let lastCommandTime = 0;

const client = new Client({
  intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent,
    ]
});

client.on('ready', (c) => {
    log(`logged in as: ${c.user.tag}`)
});

//client.login(config.token);

client.on('guildMemberAdd', member => {
    const embed = new EmbedBuilder()
    .setTitle('Welcome, ' + member.user.username + '!')
    .setColor(config.color)
    .setThumbnail(config.logo)
    .setFooter({
      text: config.footer,
      iconURL: config.logo,
    })
    .setTimestamp();
    member.guild.channels.cache.get(config.welcome).send({ content: `<@${member.id}>`, embeds: [embed] });
});

client.on('guildMemberRemove', member => {
    const embed = new EmbedBuilder()
    .setTitle(member.user.username + ' left the server.')
    .setColor("Red")
    .setFooter({
      text: config.footer,
      iconURL: config.logo,
    })
    .setTimestamp();
    member.guild.channels.cache.get(config.welcome).send({ embeds: [embed] });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
  
    const { commandName, options } = interaction;
  
    if (commandName === 'shop') {
    if (interaction.options.getSubcommand() === 'add') {
        const member = interaction.guild.members.cache.get(interaction.user.id);
    if (member && member.roles.cache.has(config.staffId)) {
      const name = options.getString('name');
      const price = 1
      const image = options.getString('image')
      const channel = options.getChannel('channel');

      const x = options.getString('x');
      const y = options.getString('y');
      const z = options.getString('z');

      const hierarchyData = {
        "price": price,
        "name": name,
        "x": x,
        "y": y,
        "z": z,
        "channel": channel,
        "image": image
      };
      const kitHierarchyFilePath = './data/kitHierarchy/' + name + '.json';
      if (!fs.existsSync(kitHierarchyFilePath)) {
        saveDataToFile(hierarchyData, kitHierarchyFilePath);

        const order = new ButtonBuilder()
            .setCustomId('order_' + name + '_' + price)
            .setLabel('🛒 Order')
            .setStyle(ButtonStyle.Success);

      const claimRow = new ActionRowBuilder()
            .addComponents(order);
      
      const embed = new EmbedBuilder()
        .setTitle(`**${name}**`)
        .setImage(`${image}`)
        .setColor(config.color)
        .setFooter({
          text: "React with 🛒 to claim this item",
        });
      channel.send({ embeds: [embed], components: [claimRow] });

      const embed2 = new EmbedBuilder()
      .setColor(config.color)
      .setTitle('🛒 added your item to the shop!')
      .setFooter({
        text: config.footer,
        iconURL: config.logo,
      })
      .setTimestamp();
      interaction.reply({ embeds: [embed2], ephemeral: true });

      } else {
        const embed = new EmbedBuilder()
        .setTitle('an item with this name already exists...')
        .setColor(config.color)
        .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
        .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
      };
      } else {
        const embed = new EmbedBuilder()
        .setTitle("you lack the permissions to execute this command...")
        .setColor(config.color)
        .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
        .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    }

    if (interaction.options.getSubcommand() === 'add-mystery') {
      const member = interaction.guild.members.cache.get(interaction.user.id);
      if (member && member.roles.cache.has(config.staffId)) {
      const channel = interaction.options.getChannel('channel');
      const order = new ButtonBuilder()
      .setCustomId('order_' + 'mystery' + '_' + 1)
      .setLabel('🛒 Order')
      .setStyle(ButtonStyle.Success);

      const claimRow = new ActionRowBuilder()
            .addComponents(order);

      const embed = new EmbedBuilder()
        .setTitle(`**Mystery Item**`)
        .setImage(`https://images.pexels.com/photos/356079/pexels-photo-356079.jpeg`)
        .setColor(config.color)
        .setFooter({
          text: "React with 🛒 to claim this item",
        });
      channel.send({ embeds: [embed], components: [claimRow] });
      } else {
        const embed = new EmbedBuilder()
        .setTitle("you lack the permissions to execute this command...")
        .setColor(config.color)
        .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
        .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    if (interaction.options.getSubcommand() === 're-add') {
      const member = interaction.guild.members.cache.get(interaction.user.id);
      if (member && member.roles.cache.has(config.staffId)) {
        const directoryPath = './data/kitHierarchy';
        fs.readdirSync(directoryPath).forEach(file => {
            const filePath = path.join(directoryPath, file);
            if (fs.statSync(filePath).isFile()) {
              const kitData = JSON.parse(fs.readFileSync(`./data/kitHierarchy/${file}`, "utf-8"));

              const channel = client.channels.cache.get(kitData.channel.id);
              const image = kitData.image;
              const name = kitData.name;
              const price = kitData.price

              const order = new ButtonBuilder()
              .setCustomId('order_' + name + '_' + price)
              .setLabel('🛒 Order')
              .setStyle(ButtonStyle.Success);
  
              const claimRow = new ActionRowBuilder()
                    .addComponents(order);
              
              const embed = new EmbedBuilder()
                .setTitle(`**${name}**`)
                .setImage(image)
                .setColor(config.color)
                .setFooter({
                  text: "React with 🛒 to claim this item",
                });
              channel.send({ embeds: [embed], components: [claimRow] });
            }
        });
      } else {
        const embed = new EmbedBuilder()
        .setTitle("you lack the permissions to execute this command...")
        .setColor(config.color)
        .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
        .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
    };

    if (commandName === 'banner') {
      const banner = interaction.options.getAttachment('attachment');
      if (banner.contentType !== "image/gif" && banner.contentType !== "image/png") {
        interaction.reply({ content: 'image needs to be a .gif or .png file...', ephemeral: true });
      }
      await client.rest.patch(Routes.user(), {
        body: { 
          banner: await DataResolver.resolveImage(banner.url)
        }
      }).catch(async err => {
        await interaction.reply({ content: 'error:\n' + err, ephemeral: true })
        return
      })
      interaction.reply({ content: 'succesfully added the banner.', ephemeral: true });
    }

    if (commandName === 'nocooldown') {
      const member = interaction.guild.members.cache.get(interaction.user.id);
      if (member && member.roles.cache.has(config.staffId)) {
      if (interaction.options.getSubcommand() === 'add') {
	    const user = interaction.options.getUser('name');
        fs.appendFileSync('./data/noCooldown.txt', `${user.username}\n`);
        interaction.reply({ content: `succesfully added ${user.username} to the no cooldown list`, ephemeral: true });
      }
      if (interaction.options.getSubcommand() === 'remove') {
	    const user = interaction.options.getUser('name');
        removeNoCooldown(user);
        interaction.reply({ content: `succesfully removed ${user.username} from the no cooldown list`, ephemeral: true });
      }
    } else {
      interaction.reply({ content: 'no perms...', ephemeral: true });
    }
    };
});

client.on('interactionCreate', async interaction => {
  
    if (!interaction.isButton()) return;
  
    if (interaction.customId.startsWith('order_')) {
      const args = splitCustomId(interaction.customId);
      const name = args[1];
      const price = args[2];
        const modal = new ModalBuilder()
        .setCustomId(`order_${name}_${price}`)
        .setTitle('your in game name');
        const ingamenameInput = new TextInputBuilder()
        .setCustomId('ingamenameInput')
        .setLabel("What is your in game name?")
        .setStyle(TextInputStyle.Short);
        const Row = new ActionRowBuilder()
        .addComponents(ingamenameInput);
        modal.addComponents(Row)
        interaction.showModal(modal);
    }
});

client.on("interactionCreate", interaction => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId.startsWith('order_')) {
    const args = splitCustomId(interaction.customId);
    const ign = interaction.fields.getTextInputValue('ingamenameInput');
    const name = args[1];
    const onlineStatus = checkIfUserIsOnline(ign);
    const currentTime = Date.now();

    if (onlineStatus === true) {
      if (!commandCooldowns[interaction.user.username] || currentTime - commandCooldowns[interaction.user.username] >= 15 * 60 * 1000) {
        if (isServerOnCooldown()) {
          const embed = new EmbedBuilder()
          .setTitle("i am already delivering a kit")
          .setDescription("try again in a 30 seconds")
          .setColor(config.color)
          .setFooter({
              text: config.footer,
              iconURL: config.logo,
            })
          .setTimestamp();
          interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          const embed = new EmbedBuilder()
          .setTitle("succesfully started delivering your kit")
          .setDescription("accept the tpa request from `TSG` on alacity to recieve your kit.")
          .setColor(config.color)
          .setFooter({
              text: config.footer,
              iconURL: config.logo,
            })
          .setTimestamp();
          interaction.reply({ embeds: [embed], ephemeral: true });

          new Delivery(name, ign, interaction);
          updateServerCooldown();
          return
        }
      } else {
        const remainingTime = Math.ceil((15 * 60 * 1000 - (currentTime - commandCooldowns[interaction.user.username])) / 1000);
        
        const embed = new EmbedBuilder()
        .setTitle("you are on cooldown")
        .setDescription('you have ' + '`' + `${format(remainingTime)}` + '` left until you can order again.')
        .setColor(config.color)
        .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
        .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } else {
      const embed = new EmbedBuilder()
      .setTitle("the given username is not online so the order can not be completed...")
      .setColor(config.color)
      .setFooter({
          text: config.footer,
          iconURL: config.logo,
        })
      .setTimestamp();
      interaction.reply({ embeds: [embed], ephemeral: true });
    };
  }
});

class Delivery {
  constructor(name, ign, interaction, minecraft=false) {
      // code edited by fit.mc
      this.name = name;
      this.ign = ign;
      this.interaction = interaction;
      this.minecraft = minecraft;

      log(`${ign} ordered a kit named ${name}!`)
      const kitData = JSON.parse(fs.readFileSync(`./data/kitHierarchy/${name}.json`, "utf-8"));
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalNear(kitData.x, kitData.y, kitData.z, 1));
      bot.on("goal_reached", () => {
        const chestToOpen = bot.blockAt(new Vec3(kitData.x, kitData.y, kitData.z));
        if (chestToOpen && chestToOpen.name === 'trapped_chest') {
          bot.openChest(chestToOpen);
    
          bot.on("windowOpen", (window) => {
            setTimeout(() => {
              window.close();   
            }, 500);
          });
          setTimeout(() => {
            const coolIgn = ign.split('\n')
            console.log(coolIgn[0]);
            bot.chat(`/tpa ${coolIgn}`);
            return
          }, 2000);,
          
          bot.on("messagestr", (message) => {
            if (message.startsWith(config.tpaAcceptedMessage)) {
                logCords(this.interaction, ign, new Date(), kitData, bot, minecraft=minecraft)
                setTimeout(() => {
                  bot.chat('/kill');
                }, 500);
                const currentTime = Date.now();
    
                const fileContent = fs.readFileSync('./data/noCooldown.txt', 'utf-8');
                const linesArray = fileContent.split('\n');
                const containsString = linesArray.includes((minecraft) ? ign : interaction.user.username);
    
                if (containsString) {
                  return;
                } else {
                  commandCooldowns[(minecraft) ? ign : interaction.user.username] = currentTime;
                };
                return
              } else if (message.startsWith(config.pendingRequest)) {
                setTimeout(() => {
                  bot.chat('/kill');
                }, 500);
                if (minecraft) {
                  bot.chat(`/w ${ign} someone has a request pending to you while the bot tried to tpa. try again..`);
                  return;
                }
                interaction.reply({ content: 'someone has a request pending to you while the bot tried to tpa. try again..', ephemeral: true });
                return
              }
          });
        } else {
          log('No chest found at the specified coordinates.');
          return
        }
      });
  }
};

function removeNoCooldown(user) {
  const filePath = './data/noCooldown.txt';
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }
    const lines = data.split('\n');
    const matchingLines = lines.filter(line => !line.includes(user.username));
    const modifiedContent = matchingLines.join('\n');
    fs.writeFile(filePath, modifiedContent, 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
    });
  });
}

function isServerOnCooldown() {
  const currentTime = Date.now();
  return currentTime - lastCommandTime < globalCooldown;
}

function updateServerCooldown() {
  lastCommandTime = Date.now();
}

function format(seconds){
  function pad(s){
    return (s < 10 ? '0' : '') + s;
  }
  var minutes = Math.floor(seconds % (60*60) / 60);
  var seconds = Math.floor(seconds % 60);

  return pad(minutes) + ':' + pad(seconds);
}

function logCords(interaction, ign, orderTime, kitData, bot, minecraft=false) {
    // code edited by fit.mc
    const position = bot.entity.position; 
    const { x, y, z } = position; 
    const fixedX = x.toFixed(1);
    const fixedY = y.toFixed(1);
    const fixedZ = z.toFixed(1);
    const dimension = bot.game.dimension

    const channel = client.channels.cache.get(config.logsChannel);
    const pfp = `https://mc-heads.net/head/${ign}`;

    let filePath = './data/cords.txt'
    
    // code edited by fit.mc
    // add a condition if the order was made through minecraft
    if (minecraft) {
        fs.appendFileSync(filePath, `(Order through minecraft): ${fixedX} ${fixedY} ${fixedZ} [dimension: ${dimension}]\n`);
    } else {
        fs.appendFileSync(filePath, `${interaction.user.username}: ${fixedX} ${fixedY} ${fixedZ} [dimension: ${dimension}]\n`);
    }

  const embed = new EmbedBuilder()
  .setAuthor({
    name: "TSG SHOP",
  })
  .setTitle(`${ign}'s order info`)
  .addFields(
    {
      name: "Order:",
      value: `kit name:  **${kitData.name}**\ntime of order: ${time(orderTime, 'R')}`,
      inline: false
    },
    {
      name: "Cords:",
      value: `X: **${fixedX}**\nY: **${fixedY}**\nZ: **${fixedZ}**\nDimension: **${dimension}**\nFull Coordinates:\n` + "```" + `\nX: ${fixedX}, Y: ${fixedY}, Z: ${fixedZ} Dimension: ${dimension}\n` + "```",
      inline: false
    },
    {
      // code edited by fit.mc
      name: "Receipt:",
      value: "```" + (!minecraft) ? 
      `\n${ign}'s Order:\n  -  item name: ${kitData.name}\n  -  time of order: ${orderTime}\n  -  Coordinates:\n    -  X: ${fixedX}\n    -  Y: ${fixedY}\n    -  Z: ${fixedZ}\n    -  Dimension: ${dimension}\n\n  - Discord:\n    -  Username: ${interaction.user.username}\n    -  Id: ${interaction.user.id}\n\n-------------------\n     TSG SHOP\n-------------------\n` + "```"
      : `\n${ign}'s Order:\n  -  item name: ${kitData.name}\n  -  time of order: ${orderTime}\n  -  Coordinates:\n    -  X: ${fixedX}\n    -  Y: ${fixedY}\n    -  Z: ${fixedZ}\n    -  Dimension: ${dimension}\n\n  - Discord:\n    -  Username: (Order through minecraft)\n    -  Id: (Order through minecraft)\n\n-------------------\n     TSG SHOP\n-------------------\n` + "```",
      inline: false
    },
  )
  .setImage(config.banner)
  .setThumbnail(pfp)
  .setColor(config.color)
  .setFooter({
    text: "Made By Capy",
  })
  .setTimestamp();
  channel.send({ embeds: [embed] });
}

function incrementDeliveredCount() {
  let filePath = './data/delivered.txt';
  if(!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 0);
  } else {
      let count = parseInt(fs.readFileSync(filePath, 'utf8'));
      count += 1;
      fs.writeFileSync(filePath, count);
  }
}

function splitCustomId(input) {
    const result = input.split('_');
    return result;
}

function checkIfUserIsOnline(ign) {
  const player = bot.players[ign];
  if (player) {
    return true;
  } else {
    return false;
  }
}

function saveDataToFile(data, filePath) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getTimeStamp() {
  const currentDate = new Date();
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function log(input) {
  console.log(`[${getTimeStamp()}] > ${input}`);
}

function wait(ms){
  let start = new Date().getTime();
  let end = start;
  while(end < start + ms) {
    end = new Date().getTime();
 }
}

};
mainBot();