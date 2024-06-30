const { Client, WebhookClient, IntentsBitField, SlashCommandBuilder, DataResolver, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, time } = require('discord.js');
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
const repl = require('repl');

var webhook = config.webhook.split('/');
const webhookId = webhook[webhook.length-2];
const webhookToken = webhook[webhook.length-1];
webhook = new WebhookClient({id: webhookId, token: webhookToken});

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
  new SlashCommandBuilder()
      .setName('cancel')
      .setDescription('cancel an order')
      .addSubcommand(subcommand =>
          subcommand
              .setName('order')
              .setDescription('(admin only) cancel an order')
              .addStringOption(option => option.setName('ign').setDescription('will remove all delivers in the queue to the specified ign').setRequired(true))),
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
    client.user.setStatus('dnd')
  });

  client.login(config.token);
  
  const bot = mineflayer.createBot({
    host: 'anarchy.6b6t.org',
    //port: '10000',
    version: '1.19.3',
    username: config.username,
    skipValidation: true,
  });
  
  bot.once("login", () => {
        setInterval(() => {
            bot.setControlState("sneak", true);
        }, 250);
        setInterval(() => {
            bot.setControlState("sneak", false);
        }, 500);
  });
  
  var secondBot = undefined;
  setTimeout(() => {
      log("attempting to connect with second bot")
      secondBot = mineflayer.createBot({
        host: 'anarchy.6b6t.org',
        version: '1.19.3',
        username: config.secondUsername,
        skipValidation: true,
      });
      client.user.setStatus('online')
  
      secondBot.on("message", (message) => {
        //console.log(`[${config.secondUsername}] > ${message}`)
        if (message.toString().includes(config.loginMessage)) {
          secondBot.chat('/login ' + config.secondPassword);
        };
      });
      
      secondBot.on("end", (reason) => {
          console.log(reason);
      })
  }, 16000);
  
  /*
  bot.once('login', () => {
      bot.setControlState("forward", true);
      setTimeout(() => {bot.setControlState('forward', false)}, 10000);
  });
  */
  
  /*
  function order(kitname, ign, amount,interaction) {
      /*
      if (!config.whitelist.includes(username.toString())) {
          bot.chat(`/w ${username.toString()} you are not on the whitelist, ask the bot owner to add you.`);
          return;
      }
      if (!commandCooldowns[username.toString()] || Date.now() - commandCooldowns[username.toString()] >= 15 * 60 * 1000) {
          if (isServerOnCooldown()) {
              bot.chat(`/w ${username.toString()} i am already delivering a kit or on tpa cooldown, you have been added to the queue.`);
              bot.queue.push(username.toString());
          } else {
              bot.chat(`/w ${username.toString()} accept the tpa request to receive your kit.`);

              new Delivery(arg, username.toString(), interaction);
              updateServerCooldown();
          }
      } else {
          const remainingTime = Math.ceil((15 * 60 * 1000 - (Date.now() - commandCooldowns[username.toString()])) / 1000);

          bot.chat(`/w ${username.toString()} you are on cooldown, you have ${format(remainingTime)} left until you can order again.`);
      }
  }
  */
  
    function delivery(name, ign, amount, interaction) {
        updateSecondaryCooldown();
        var tpaAccepted = false;
        console.log("second bot attempting tpa");
        secondBot.chat(`/tpa ${ign}`);
        bot.chat(`/w ${ign} Please accept the tpa request from ${config.secondUsername} so the delivery can start ` + makeid());
        secondBot.chat(`/w ${ign} if you kill me your order will fail! make sure i dont die ${makeid()}`);
        secondBot.chat(`/w ${ign} when the order is finished i will /kill and drop any items i picked up! ${makeid()}`)
        var deliveringIgn = ign;
        
        secondBot.on("messagestr", (message) => {
            if (message.toLowerCase().startsWith(config.tpaAcceptedMessage.toLowerCase())) {
                console.log("tpa accepted");
                tpaAccepted = true;
                setTimeout(() => {
                    new Delivery(name, ign, amount, interaction);
                    updateServerCooldown();
                }, 16000);
            }
        });
        setTimeout(() => {
            if (!tpaAccepted) {
                cancelOrder(ign);
                lastCommandTime = 0;
            }
        }, 60000);
    }

    bot.queue = []
    bot.loadPlugin(pathfinder);
    const defaultMove = new Movements(bot);
    defaultMove.canDig = false;
    defaultMove.allowSprinting = true;
  
  // Code by fit.mc (AlphaDino) (you can remove this)
  
  /*
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
  */
  
  bot.on('physicTick', () => {
    if (!isServerOnCooldown() && bot.queue.length > 0) {
        var d = bot.queue[0];
        bot.queue.shift();
        if (!d.followup) {
            new Delivery(d.name, d.ign, d.amount, d.interaction);
            updateServerCooldown();
        } else {
            delivery(d.name, d.ign, d.amount, d.interaction);
        }
    }
  });
  
    const r = repl.start(config.username + '> ')
    r.context.bot = bot;
    r.context.secondBot = secondBot;
    
	r.on('exit', () => {
		bot.end()
	})
  
  bot.on("end", (reason) => {
      console.error(reason);
      console.log("Main bot disconnected from server");
      cancelAllOrders();
      //process.exit();
  });
  bot.on("message", (message) => {
    log(message.toAnsi());
    if (message.toString().includes(config.loginMessage)) {
        bot.chat('/login ' + config.password);
    };
    /*
    if (message.toString().includes('has requested to teleport to you. Type /tpaccept to accept it.')) {
        const args = message.toString().split(" ");
        const username = args[0];
        if (fs.readFileSync('./data/tpaWhitelist.txt').includes(username)) {
            bot.chat('/tpaccept')
        }
    }
    */
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
var globalCooldown = 630000;
let lastCommandTime = 0;
var secondaryCooldown = 61000;
var secondaryTime = 0;

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

function anyQueuedOrder(ign) {
    // check if there is any order by the ign in the queue
    for (var i = 0; i < bot.queue.length; i++) {
        var order = bot.queue[i];
        if (order.ign == ign.replace('\n', '')) {
            return true;
        }
    }
    return false;
}

function cancelAllOrders() {
    var igns = []
    for (var i = 0; i < bot.queue.length; i++) {
        if (!igns.includes(bot.queue[i].ign)) {
            igns.push(bot.queue[i].ign);
        }
    }
    for (var i = 0; i < bot.queue.length; i++) {
        cancelOrder(igns[i]);
    }
}

function cancelOrder(ign, interaction=undefined) {
    //offListeners(handler, handler2);
    let splicecache = []
    var kitstodeliver = [];
    bot.chat("/kill");
    secondBot.chat("/kill");
    client.user.setStatus('online');
    bot.chat(`/w ${ign} Order canceled ask shop owner or smth tp make the bot deliver again`);
    for (var i = 0; i < bot.queue.length; i++) {
        var order = bot.queue[i];
        if (order.ign == ign.replace('\n', '')) {
            splicecache.push(i);
        }
    }
    // remove queued delivers for the same person
    if (splicecache.length > 0) {
        for (var i = splicecache.length-1; i >= 0; i--) {
            kitstodeliver.push({"name": bot.queue[splicecache[i]].name, "ign": bot.queue[splicecache[i]].ign, "amount": bot.queue[splicecache[i]].amount})
            bot.queue.splice(splicecache[i], 1);
        }
    }
    if (interaction != undefined) {
        const embed = new EmbedBuilder()
        .setTitle('order canceled')
        .setColor(config.color)
        .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
        .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    var todeliver = {};
    if(kitstodeliver.length > 0) {
        for (var i = 0; i < kitstodeliver.length; i++) {
            if (todeliver[kitstodeliver[i].name] == undefined) {
                todeliver[kitstodeliver[i].name] = 0;
            }
            todeliver[kitstodeliver[i].name] += kitstodeliver[i].amount;
        }
    }
    let str = "";
    if (Object.keys(todeliver).length != 0) {
        str = ign + "'s order canceled\nKits left to deliver: ```\n"
        for (var i = 0; i < Object.keys(todeliver).length; i++) {
            let kitname = Object.keys(todeliver)[i];
            str += `${kitname}: ${todeliver[kitname]}\n`
        }
        str += "```"
    }
    webhook.send(`If ${ign}'s was canceled while i was waiting for a tpy it wont be counted in the kits left to deliver thing :warning:\n${str}`).catch(console.error);
}

function checkIfUserIsInQueue(ign) {
    for (var i = 0; i < bot.queue.length; i++) {
        if (ign === bot.queue[i].ign) return true;
    }
    return false;
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
  
    const { commandName, options } = interaction;
  
    if (commandName === 'cancel') {
        if (interaction.options.getSubcommand() === 'order') {
            var ign = options.getString("ign");
            if (checkIfUserIsInQueue(ign)) {
                cancelOrder(ign, interaction);
            } else {
                const embed = new EmbedBuilder()
                  .setTitle("the given username is not in the queue so the order can not be canceled...")
                  .setColor(config.color)
                  .setFooter({
                      text: config.footer,
                      iconURL: config.logo,
                    })
                  .setTimestamp();
                  interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
  
    if (commandName === 'shop') {
    if (interaction.options.getSubcommand() === 'add') {
        const member = interaction.guild.members.cache.get(interaction.user.id);
    if (member && member.roles.cache.has(config.staffId)) {
      const name = options.getString('name');
      const price = 1;
      const image = options.getString('image');
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
        .setTitle('Order');
        
        const ingamenameInput = new TextInputBuilder()
        .setCustomId('ingamenameInput')
        .setLabel("in game name")
        .setStyle(TextInputStyle.Short);
        
        const amountInput = new TextInputBuilder()
        .setCustomId('amountInput')
        .setLabel("amount of kits to be delivered?")
        .setStyle(TextInputStyle.Short);
        
        const firstRow = new ActionRowBuilder()
        .addComponents(ingamenameInput);
        const secondRow = new ActionRowBuilder()
        .addComponents(amountInput);
        
        modal.addComponents(firstRow, secondRow)
        interaction.showModal(modal);
    }
});

var lastDeliver = '';
client.on("interactionCreate", interaction => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId.startsWith('order_')) {
    const args = splitCustomId(interaction.customId);
    const ign = interaction.fields.getTextInputValue('ingamenameInput');
    const amount = interaction.fields.getTextInputValue('amountInput');
    const name = args[1];
    const onlineStatus = checkIfUserIsOnline(ign);
    const currentTime = Date.now();
    
    console.log("Ordering");

    if (onlineStatus === true) {
      if (!commandCooldowns[interaction.user.username] || currentTime - commandCooldowns[interaction.user.username] >= 15 * 60 * 1000) {
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

          if (bot.queue.length < 1 && !isOnsSecondaryCooldown()) {
              delivery(name, ign, amount, interaction);
              lastDeliver = ign;
          } else {
              console.log("pushing to queue");
              // these are followup orders this makes sure its actually possible to follow up
              if (lastDeliver == ign) {
                  bot.queue.push({name:name, ign:ign, amount:amount, interaction:interaction});
                  if (!isServerOnCooldown()) {
                      updateServerCooldown();
                  }
              } else {
                  // start new followuppable order
                  bot.queue.push({name:name, ign:ign, amount:amount, interaction:interaction, followup:true});
                  lastDeliver = ign;
                  if (!isServerOnCooldown()) {
                      updateServerCooldown();
                  }
              }
          }
          return
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

async function openContainer(block) {
    const c = await bot.openContainer(block);
    return c;
}

async function withdrawItem(chest, name, amount) {
    const item = itemByName(chest.containerItems(), name)
    if (item) {
      try {
        await chest.withdraw(item.type, null, amount)
        console.log(`withdrew ${amount} ${item.name}`)
      } catch (err) {
        console.log(`unable to withdraw ${amount} ${item.name}`)
      }
    } else {
      console.log(`unknown item ${name}`)
    }
}

function itemByName (items, name) {
    let item
    let i
    for (i = 0; i < items.length; ++i) {
        item = items[i]
        if (item && item.name.includes(name)) return item
    }
    return null
}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function makeid(length=randomIntFromInterval(10, 15)) {
    var result           = '';
    //var characters       = '+-=!@#$%\"\'&*();:][{}/?~z,.<>^ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var characters = 'abcdefghijklmnopqrstuvwxyz'
	var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function offListeners(handler, handler2) {
    bot.off("goal_reached", handler);
    bot.off("messagestr", handler2);
}

class Delivery {
  constructor(name, ign, amount, interaction, minecraft=false) {
      // code edited by fit.mc
      function range (start, end) { return [...Array(1+end-start).keys()].map(v => start+v) }
      this.name = name;
      this.ign = ign;
      this.interaction = interaction;
      this.minecraft = minecraft;
      this.amount = parseInt(amount);

      log(`${ign} ordered a kit named ${name}!`)
      const kitData = JSON.parse(fs.readFileSync(`./data/kitHierarchy/${name}.json`, "utf-8"));
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalNear(kitData.x, kitData.y, kitData.z, 1));
      bot.once("goal_reached", function handler() {
        //bot.off("goal_reached", handler);
        var chest;
        const chestToOpen = bot.blockAt(new Vec3(kitData.x, kitData.y, kitData.z));
        bot.on("windowOpen", (window) => {
            setTimeout(() => {
                if (amount > 36) {
                    //bot.chat(`/w ${ign} delivering more than 36 kits, please stay online and wait for my tpa cooldown so i can deliver the full order`);
                    var amounts = new Array(Math.floor(amount / 36)).fill(36).concat(amount % 36);
                    amount = amounts[0];
                    amounts.shift();
                    for (var i = 0; i < amounts.length; i++) {
                        let a = amounts[i];
                        let delivr = {"name": name, "ign": ign, "amount": a, "interaction":interaction}
                        bot.queue.push(delivr)
                    }
                }
                client.user.setStatus('dnd')
                withdrawItem(chest, "experience", amount) // change to shulker_box
            }, 500);
            setTimeout(() => {
              window.close();   
            }, 1000);
        });
        if (chestToOpen && chestToOpen.name === 'chest') {
            openContainer(chestToOpen).then(function(c) {
                chest = c;
                bot.chat(`/tpa ${config.secondUsername}`);
                setTimeout(() => {
                    secondBot.chat(`/tpy ${config.username}`);
                }, 500);
                
                bot.on("messagestr", function handler2(message) {
                    //bot.off("messagestr", handler2);
                    if (message.toLowerCase().startsWith(config.tpaAcceptedMessage.toLowerCase())) {
                        //logCords(this.interaction, ign, new Date(), kitData, bot, minecraft=minecraft)
                        setTimeout(() => {
                          if (bot.queue.length < 1) {
                              client.user.setStatus('online');
                          }
                          
                          console.log("order complete");
                          
                          if (!anyQueuedOrder(ign) || true) {
                              bot.chat('/kill');
                              secondBot.chat("/kill");
                              secondBot.chat(`/w ${ign} order complete`);
                              offListeners(handler, handler2);
                          }
                        }, 16000);
                        const currentTime = Date.now();

                        const fileContent = fs.readFileSync('./data/noCooldown.txt', 'utf-8');
                        const linesArray = fileContent.split('\n');
                        const containsString = linesArray.includes((minecraft) ? ign : interaction.user.username);

                        if (containsString) {
                          return;
                        } else {
                          commandCooldowns[(minecraft) ? ign : interaction.user.username] = currentTime;
                        };
                        return;
                    }
                });
          });
        } else {
          log('No chest found at the specified coordinates.');
          bot.chat("/w ${ign} no chest was found at the stash ask the bot owner to fix it");
          secondBot.chat("/kill");
          //offListeners();
          return;
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

function isOnsSecondaryCooldown() {
  const currentTime = Date.now();
  return currentTime - secondaryTime < secondaryCooldown;
}

function updateServerCooldown() {
  lastCommandTime = Date.now();
}

function updateSecondaryCooldown() {
  secondaryTime = Date.now();
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
  //channel.send({ embeds: [embed] });
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
  if (player) return true;
  return false;
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