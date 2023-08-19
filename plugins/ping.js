const { cmd } = require("../lib/");
cmd({
    pattern: "ping",
    fromMe: false,
    desc: "To check ping",
    type: "user",
  },
  async (conn, match) => {
    const start = new Date().getTime();
    await conn.sendMessage("```Ping!```");
    const end = new Date().getTime();
    return await conn.sendMessage(
      "*Pong!*\n ```" + (end - start) + "``` *ms*"
    );
  }
);
