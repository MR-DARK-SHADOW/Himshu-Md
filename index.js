const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, DisconnectReason } = require("@whiskeysockets/baileys");
const path = require("path");
const { Image, Message, Sticker, Video } = require("./lib/Messages");
let fs = require("fs");
let config = require("./config");
const pino = require("pino");
logger = pino({
  level: "silent",
});
const plugins = require("./lib/plugins");
const { serialize, Greetings } = require("./lib");

fs.readdirSync(__dirname + "/assets/database/").forEach((db) => {
  if (path.extname(db).toLowerCase() == ".js") {
    require(__dirname + "/assets/database/" + db);
  }
});

const connect = async () => {
  console.log("Himshu Md");
  console.log("Syncing Database");
  config.DATABASE.sync();
  console.log("⬇  Installing Plugins...");
  fs.readdirSync(__dirname + "/plugins").forEach((plugin) => {
    if (path.extname(plugin).toLowerCase() == ".js") {
      require(__dirname + "/plugins/" + plugin);
    }
  });
  console.log("✅ Plugins Installed!");

  const Himshu = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + "/auth_info_baileys/");
    let conn = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({
        level: "silent",
      }),
      browser: Browsers.macOS("Desktop"),
      downloadHistory: false,
      syncFullHistory: false,
    });

    conn.ev.on("connection.update", async (s) => {
      const { connection, lastDisconnect } = s;
      if (connection === "connecting") {
        console.log("ℹ Connecting to WhatsApp... Please Wait.");
      }
      if (connection === "open") {
        console.log("✅ Login Successful!");
        let str = `\`\`\`Himshu Md connected \nversion : ${
          require(__dirname + "/package.json").version
        }\nTotal Plugins : ${plugins.commands.length}\nWorktype: ${
          config.WORK_TYPE
        }\`\`\``;
        conn.sendMessage(conn.user.id, {
          text: str,
        });
      }

      if (connection === "close") {
        const { error, message } = lastDisconnect.error?.output.payload;
        if (
          lastDisconnect.error?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          await delay(300);
          Himshu();
          console.log("reconnecting...");
        } else {
          console.log("connection closed\nDevice logged out.");
          await delay(3000);
          process.exit(0);
        }
      }
    });

    conn.ev.on("creds.update", saveCreds);

    conn.ev.on('messages.upsert', async(mek) => {
      try {
      mek = mek.messages[0]
      if (!mek.message) return	
      mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
      if (mek.key && mek.key.remoteJid === 'status@broadcast') return
      const m = sms(conn, mek)
      const type = getContentType(mek.message)
      const content = JSON.stringify(mek.message)
      const from = mek.key.remoteJid
      const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
      const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
      const isCmd = body.startsWith(prefix)
      const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
      const args = body.trim().split(/ +/).slice(1)
      const q = args.join(' ')
      const isGroup = from.endsWith('@g.us')
      const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
      const senderNumber = sender.split('@')[0]
      const botNumber = conn.user.id.split(':')[0]
      const pushname = mek.pushName || 'Sin Nombre'
      const isMe = botNumber.includes(senderNumber)
      const isOwner = ownerNumber.includes(senderNumber) || isMe
      const botNumber2 = await jidNormalizedUser(conn.user.id);
      const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : ''
      const groupName = isGroup ? groupMetadata.subject : ''
      const participants = isGroup ? await groupMetadata.participants : ''
      const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
      const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
      const isAdmins = isGroup ? groupAdmins.includes(sender) : false
      const reply = (teks) => {
      conn.sendMessage(from, { text: teks }, { quoted: mek })
      }
      conn.sendFileUrl = async(jid, url, caption, quoted, options = {}) => {
        let mime = '';
        let res = await axios.head(url)
        mime = res.headers['content-type']
        if (mime.split("/")[1] === "gif") {
            return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options })
        }
        let type = mime.split("/")[0] + "Message"
        if (mime === "application/pdf") {
            return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options })
        }
        if (mime.split("/")[0] === "image") {
            return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options })
        }
        if (mime.split("/")[0] === "video") {
            return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options })
        }
        if (mime.split("/")[0] === "audio") {
            return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options })
        }
      }
      //==================================plugin map================================
      const events = require('./lib/command')
      const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
      if (isCmd) {
      const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName))
      if (cmd) {
      if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }})
      
      try {
      cmd.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
      } catch (e) {
      console.error("[PLUGIN ERROR] ", e);
      }
      }
      }
      events.commands.map(async(command) => {
      if (body && command.on === "body") {
      command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
      } else if (mek.q && command.on === "text") {
      command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
      } else if (
      (command.on === "image" || command.on === "photo") &&
      mek.type === "imageMessage"
      ) {
      command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
      } else if (
      command.on === "sticker" &&
      mek.type === "stickerMessage"
      ) {
      command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
      }});
      //============================================================================ 
      if (!isMe && !isGroup && config.ONLY_GROUP == 'true') return 
      //============================================================================
      if (config.ANTI_LINK && !isMe) {
      if (body.match(`chat.whatsapp.com`)) {
      if(groupAdmins.includes(sender)) return
      await conn.sendMessage(from, { delete: mek.key })  
      }}
      //============================================================================
      const bad = await fetchJson(`https://raw.githubusercontent.com/vihangayt0/server-/main/badby_alpha.json`)
      if (config.ANTI_BAD){
        if (!isAdmins) {
        for (any in bad){
        if (body.toLowerCase().includes(bad[any])){  
          if (!body.includes('tent')) {
            if (!body.includes('docu')) {
              if (!body.includes('https')) {
        if (groupAdmins.includes(sender)) return 
        if (mek.key.fromMe) return   
        await conn.sendMessage(from, { delete: mek.key })  
        await conn.sendMessage(from , { text: '*Bad word detected !*'})
        await conn.groupParticipantsUpdate(from,[sender], 'remove')
        }}}}}}}
      //====================================================================
      switch (command) {
      case 'jid':
      reply(from)
      break
        
      default:				
      if (isOwner && body.startsWith('>')) {
      let bodyy = body.split('>')[1]
      let code2 = bodyy.replace("°", ".toString()");
      try {
      let resultTest = await eval(code2);
      if (typeof resultTest === "object") {
      reply(util.format(resultTest));
      } else {
      reply(util.format(resultTest));
      }
      } catch (err) {
      reply(util.format(err));
      }}}
      } catch (e) {
      const isError = String(e)
      console.log(isError)}
      })
      }
    }

connect();
